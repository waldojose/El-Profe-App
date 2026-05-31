from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
)
import io
import base64
import hashlib
import asyncio
import dictionary_tools as dt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'professor-app-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"

# Stripe configuration (read from env, never hardcode secrets).
# Endpoints guard on STRIPE_SECRET_KEY so the app boots fine without Stripe set up.
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '').strip()
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '').strip()
STRIPE_PRICE_ID = os.environ.get('STRIPE_PRICE_ID', '').strip()
PUBLIC_BASE_URL = os.environ.get('PUBLIC_BASE_URL', '').strip()


def _get_stripe():
    """Lazily import + configure the stripe SDK. Returns None if not configured."""
    if not STRIPE_SECRET_KEY:
        return None
    try:
        import stripe  # imported lazily so a missing package never crashes startup
    except ImportError:
        return None
    stripe.api_key = STRIPE_SECRET_KEY
    return stripe


def _base_url(request) -> str:
    """Resolve the public base URL for redirect targets."""
    if PUBLIC_BASE_URL:
        return PUBLIC_BASE_URL.rstrip('/')
    origin = request.headers.get('origin')
    if origin:
        return origin.rstrip('/')
    return 'http://localhost:3000'


app = FastAPI()
api_router = APIRouter(prefix="/api")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, song_id: str):
        await websocket.accept()
        if song_id not in self.active_connections:
            self.active_connections[song_id] = []
        self.active_connections[song_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, song_id: str):
        if song_id in self.active_connections:
            self.active_connections[song_id].remove(websocket)
    
    async def broadcast(self, message: dict, song_id: str):
        if song_id in self.active_connections:
            for connection in self.active_connections[song_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass

manager = ConnectionManager()

# Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    artist_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ProfileComplete(BaseModel):
    legal_name: str
    artist_name: str
    country: str
    pro_affiliation: str
    publisher: Optional[str] = None
    role: str  # Legacy, kept for backwards compatibility
    roles: List[str] = []
    music_styles: List[str] = []
    bio: Optional[str] = None
    photo_url: Optional[str] = None

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    legal_name: Optional[str] = None
    artist_name: Optional[str] = None
    country: Optional[str] = None
    pro_affiliation: Optional[str] = None
    publisher: Optional[str] = None
    role: Optional[str] = None  # Legacy field, kept for backwards compatibility
    roles: List[str] = []  # New multi-select field
    music_styles: List[str] = []
    photo_url: Optional[str] = None
    is_pro: bool = False
    profile_completed: bool = False
    bio: Optional[str] = None
    referral_code: Optional[str] = None
    referred_by: Optional[str] = None
    credits: int = 0
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Song(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str = ""
    created_by: str
    collaborators: List[str] = []
    is_locked: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SongCreate(BaseModel):
    title: str

class SongUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class ContributionLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    song_id: str
    user_id: str
    action: str
    content: str
    position: int
    chars_added: int = 0
    chars_deleted: int = 0
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SplitProposal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    song_id: str
    splits: List[Dict[str, Any]]
    proposed_by: str
    status: str = "draft"
    version: int = 1
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SplitCreate(BaseModel):
    song_id: str
    splits: List[Dict[str, Any]]

class SignatureCreate(BaseModel):
    split_proposal_id: str
    signature_data: str

class Signature(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    split_proposal_id: str
    user_id: str
    signature_data: str
    signed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    signature_hash: Optional[str] = None

class Version(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    song_id: str
    content: str
    snapshot_type: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    receiver_id: str
    content: str
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageCreate(BaseModel):
    receiver_id: str
    content: str

class CollaborationInvite(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    song_id: str
    inviter_id: str
    invitee_id: str
    message: str
    status: str = "pending"  # pending, accepted, declined
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InviteCreate(BaseModel):
    song_id: str
    invitee_id: str
    message: str

class UserPublicProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    artist_name: str
    legal_name: Optional[str] = None
    role: Optional[str] = None  # Legacy
    roles: List[str] = []
    music_styles: List[str] = []
    country: Optional[str] = None
    pro_affiliation: Optional[str] = None
    is_pro: bool = False
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: datetime

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Auth endpoints
@api_router.post("/auth/register")
async def register(user_data: UserRegister, referral_code: Optional[str] = None):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate unique referral code for new user
    import random
    import string
    new_referral_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    user = User(
        email=user_data.email,
        artist_name=user_data.artist_name,
        referral_code=new_referral_code
    )
    
    # Check if registered via referral
    if referral_code:
        referrer = await db.users.find_one({"referral_code": referral_code})
        if referrer:
            user.referred_by = referrer["id"]
    
    user_dict = user.model_dump()
    user_dict["password"] = hash_password(user_data.password)
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    
    token = create_access_token({"user_id": user.id, "email": user.email})
    
    return {
        "token": token,
        "user": user.model_dump()
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user_doc["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"user_id": user_doc["id"], "email": user_doc["email"]})
    
    user_doc.pop("_id", None)
    user_doc.pop("password", None)
    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    
    return {
        "token": token,
        "user": User(**user_doc).model_dump()
    }

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/profile/complete")
async def complete_profile(profile_data: ProfileComplete, current_user: User = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {
            "legal_name": profile_data.legal_name,
            "artist_name": profile_data.artist_name,
            "country": profile_data.country,
            "pro_affiliation": profile_data.pro_affiliation,
            "publisher": profile_data.publisher,
            "role": profile_data.role,  # Keep for backwards compatibility
            "roles": profile_data.roles,
            "music_styles": profile_data.music_styles,
            "bio": profile_data.bio,
            "photo_url": profile_data.photo_url,
            "profile_completed": True
        }}
    )
    
    updated_user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "password": 0})
    if isinstance(updated_user.get("created_at"), str):
        updated_user["created_at"] = datetime.fromisoformat(updated_user["created_at"])
    
    return User(**updated_user)

# Song endpoints
@api_router.post("/songs", response_model=Song)
async def create_song(song_data: SongCreate, current_user: User = Depends(get_current_user)):
    if not current_user.profile_completed:
        raise HTTPException(status_code=403, detail="Complete your profile first")
    
    if not current_user.is_pro:
        song_count = await db.songs.count_documents({"created_by": current_user.id})
        if song_count >= 3:
            raise HTTPException(status_code=403, detail="Free plan limited to 3 songs. Upgrade to Pro.")
    
    song = Song(
        title=song_data.title,
        created_by=current_user.id,
        collaborators=[current_user.id]
    )
    
    song_dict = song.model_dump()
    song_dict["created_at"] = song_dict["created_at"].isoformat()
    song_dict["updated_at"] = song_dict["updated_at"].isoformat()
    
    await db.songs.insert_one(song_dict)
    return song

@api_router.get("/songs", response_model=List[Song])
async def get_songs(current_user: User = Depends(get_current_user)):
    songs = await db.songs.find(
        {"$or": [
            {"created_by": current_user.id},
            {"collaborators": current_user.id}
        ]},
        {"_id": 0}
    ).to_list(1000)
    
    for song in songs:
        if isinstance(song.get("created_at"), str):
            song["created_at"] = datetime.fromisoformat(song["created_at"])
        if isinstance(song.get("updated_at"), str):
            song["updated_at"] = datetime.fromisoformat(song["updated_at"])
    
    return [Song(**song) for song in songs]

@api_router.get("/songs/{song_id}", response_model=Song)
async def get_song(song_id: str, current_user: User = Depends(get_current_user)):
    song = await db.songs.find_one({"id": song_id}, {"_id": 0})
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    if current_user.id not in song.get("collaborators", []) and song.get("created_by") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if isinstance(song.get("created_at"), str):
        song["created_at"] = datetime.fromisoformat(song["created_at"])
    if isinstance(song.get("updated_at"), str):
        song["updated_at"] = datetime.fromisoformat(song["updated_at"])
    
    return Song(**song)

@api_router.patch("/songs/{song_id}", response_model=Song)
async def update_song(song_id: str, song_data: SongUpdate, current_user: User = Depends(get_current_user)):
    song = await db.songs.find_one({"id": song_id})
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    if current_user.id not in song.get("collaborators", []):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if song.get("is_locked"):
        raise HTTPException(status_code=403, detail="Song is locked")
    
    update_data = {k: v for k, v in song_data.model_dump(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.songs.update_one({"id": song_id}, {"$set": update_data})
    
    updated_song = await db.songs.find_one({"id": song_id}, {"_id": 0})
    if isinstance(updated_song.get("created_at"), str):
        updated_song["created_at"] = datetime.fromisoformat(updated_song["created_at"])
    if isinstance(updated_song.get("updated_at"), str):
        updated_song["updated_at"] = datetime.fromisoformat(updated_song["updated_at"])
    
    return Song(**updated_song)

@api_router.delete("/songs/{song_id}")
async def delete_song(song_id: str, current_user: User = Depends(get_current_user)):
    song = await db.songs.find_one({"id": song_id})
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    if song.get("created_by") != current_user.id:
        raise HTTPException(status_code=403, detail="Only creator can delete")
    
    await db.songs.delete_one({"id": song_id})
    return {"message": "Song deleted"}

# Add collaborator to song
@api_router.post("/songs/{song_id}/collaborators")
async def add_collaborator(song_id: str, collaborator_data: Dict[str, Any], current_user: User = Depends(get_current_user)):
    song = await db.songs.find_one({"id": song_id})
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    if current_user.id not in song.get("collaborators", []) and song.get("created_by") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Find user by email
    collaborator_email = collaborator_data.get("email")
    collaborator = await db.users.find_one({"email": collaborator_email}, {"_id": 0, "password": 0})
    
    if not collaborator:
        raise HTTPException(status_code=404, detail="User not found with that email")
    
    # Check if already a collaborator
    if collaborator["id"] in song.get("collaborators", []):
        raise HTTPException(status_code=400, detail="User is already a collaborator")
    
    # Add to collaborators
    await db.songs.update_one(
        {"id": song_id},
        {"$push": {"collaborators": collaborator["id"]}}
    )
    
    return {"message": "Collaborator added", "collaborator": collaborator}

# Get song collaborators
@api_router.get("/songs/{song_id}/collaborators")
async def get_collaborators(song_id: str, current_user: User = Depends(get_current_user)):
    song = await db.songs.find_one({"id": song_id})
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    if current_user.id not in song.get("collaborators", []) and song.get("created_by") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    collaborator_ids = song.get("collaborators", [])
    collaborators = await db.users.find(
        {"id": {"$in": collaborator_ids}},
        {"_id": 0, "id": 1, "email": 1, "artist_name": 1, "legal_name": 1}
    ).to_list(1000)
    
    return collaborators

# Contribution tracking
@api_router.post("/contributions")
async def log_contribution(log_data: Dict[str, Any], current_user: User = Depends(get_current_user)):
    contribution = ContributionLog(
        song_id=log_data["song_id"],
        user_id=current_user.id,
        action=log_data["action"],
        content=log_data.get("content", ""),
        position=log_data.get("position", 0),
        chars_added=log_data.get("chars_added", 0),
        chars_deleted=log_data.get("chars_deleted", 0)
    )
    
    contrib_dict = contribution.model_dump()
    contrib_dict["timestamp"] = contrib_dict["timestamp"].isoformat()
    
    await db.contributions.insert_one(contrib_dict)
    return {"message": "Contribution logged"}

@api_router.get("/contributions/{song_id}")
async def get_contributions(song_id: str, current_user: User = Depends(get_current_user)):
    contributions = await db.contributions.find({"song_id": song_id}, {"_id": 0}).to_list(10000)
    
    stats = {}
    for contrib in contributions:
        user_id = contrib["user_id"]
        if user_id not in stats:
            stats[user_id] = {"chars_added": 0, "chars_deleted": 0, "net_chars": 0}
        stats[user_id]["chars_added"] += contrib.get("chars_added", 0)
        stats[user_id]["chars_deleted"] += contrib.get("chars_deleted", 0)
        stats[user_id]["net_chars"] = stats[user_id]["chars_added"] - stats[user_id]["chars_deleted"]
    
    user_ids = list(stats.keys())
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "artist_name": 1}).to_list(1000)
    user_map = {u["id"]: u["artist_name"] for u in users}
    
    result = []
    for user_id, user_stats in stats.items():
        result.append({
            "user_id": user_id,
            "artist_name": user_map.get(user_id, "Unknown"),
            **user_stats
        })
    
    return result

# Split management
@api_router.post("/splits")
async def create_split(split_data: SplitCreate, current_user: User = Depends(get_current_user)):
    if not current_user.is_pro:
        raise HTTPException(status_code=403, detail="Pro plan required for split management")
    
    song = await db.songs.find_one({"id": split_data.song_id})
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    latest_version = await db.split_proposals.find_one(
        {"song_id": split_data.song_id},
        sort=[("version", -1)]
    )
    
    version = (latest_version["version"] + 1) if latest_version else 1
    
    proposal = SplitProposal(
        song_id=split_data.song_id,
        splits=split_data.splits,
        proposed_by=current_user.id,
        version=version
    )
    
    proposal_dict = proposal.model_dump()
    proposal_dict["created_at"] = proposal_dict["created_at"].isoformat()
    
    await db.split_proposals.insert_one(proposal_dict)
    return proposal

@api_router.get("/splits/{song_id}")
async def get_splits(song_id: str, current_user: User = Depends(get_current_user)):
    splits = await db.split_proposals.find({"song_id": song_id}, {"_id": 0}).sort("version", -1).to_list(1000)
    
    for split in splits:
        if isinstance(split.get("created_at"), str):
            split["created_at"] = datetime.fromisoformat(split["created_at"])
    
    return [SplitProposal(**split) for split in splits]

@api_router.post("/splits/{proposal_id}/approve")
async def approve_split(proposal_id: str, current_user: User = Depends(get_current_user)):
    if not current_user.is_pro:
        raise HTTPException(status_code=403, detail="Pro plan required")
    
    proposal = await db.split_proposals.find_one({"id": proposal_id})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    await db.split_proposals.update_one({"id": proposal_id}, {"$set": {"status": "approved"}})
    return {"message": "Split approved"}

@api_router.post("/signatures")
async def create_signature(sig_data: SignatureCreate, current_user: User = Depends(get_current_user)):
    proposal = await db.split_proposals.find_one({"id": sig_data.split_proposal_id})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    # Signing is open to any co-writer of the song (free or pro). The owner needs
    # Pro to PROPOSE/EXPORT splits, but every collaborator must be able to SIGN.
    song_for_auth = await db.songs.find_one({"id": proposal["song_id"]})
    allowed = set((song_for_auth or {}).get("collaborators", []))
    if song_for_auth and song_for_auth.get("created_by"):
        allowed.add(song_for_auth["created_by"])
    if current_user.id not in allowed:
        raise HTTPException(status_code=403, detail="Only co-writers of this song can sign")

    signature = Signature(
        split_proposal_id=sig_data.split_proposal_id,
        user_id=current_user.id,
        signature_data=sig_data.signature_data
    )

    sig_dict = signature.model_dump()
    sig_dict["signed_at"] = sig_dict["signed_at"].isoformat()

    # Lightweight tamper-evident audit value: sha256 of the signing context.
    audit_payload = (
        f"{sig_dict['split_proposal_id']}|{sig_dict['user_id']}|"
        f"{sig_dict['signature_data']}|{sig_dict['signed_at']}"
    )
    sig_dict["signature_hash"] = hashlib.sha256(audit_payload.encode("utf-8")).hexdigest()

    await db.signatures.insert_one(sig_dict)

    # Gating rule: a split locks only when EVERY co-writer has signed it.
    song = await db.songs.find_one({"id": proposal["song_id"]})
    if song:
        collaborators = set(song.get("collaborators", []))
        if song.get("created_by"):
            collaborators.add(song["created_by"])
        signed_user_ids = set(
            await db.signatures.distinct(
                "user_id", {"split_proposal_id": sig_data.split_proposal_id}
            )
        )
        if collaborators and collaborators.issubset(signed_user_ids):
            await db.split_proposals.update_one(
                {"id": sig_data.split_proposal_id}, {"$set": {"status": "signed"}}
            )
            await db.songs.update_one(
                {"id": proposal["song_id"]}, {"$set": {"is_locked": True}}
            )

    return signature

@api_router.get("/signatures/{proposal_id}")
async def get_signatures(proposal_id: str, current_user: User = Depends(get_current_user)):
    signatures = await db.signatures.find({"split_proposal_id": proposal_id}, {"_id": 0}).to_list(1000)
    
    for sig in signatures:
        if isinstance(sig.get("signed_at"), str):
            sig["signed_at"] = datetime.fromisoformat(sig["signed_at"])
    
    return [Signature(**sig) for sig in signatures]

# Versions
@api_router.post("/versions")
async def create_version(version_data: Dict[str, Any], current_user: User = Depends(get_current_user)):
    version = Version(
        song_id=version_data["song_id"],
        content=version_data["content"],
        snapshot_type=version_data.get("snapshot_type", "manual")
    )
    
    version_dict = version.model_dump()
    version_dict["created_at"] = version_dict["created_at"].isoformat()
    
    await db.versions.insert_one(version_dict)
    return version

@api_router.get("/versions/{song_id}")
async def get_versions(song_id: str, current_user: User = Depends(get_current_user)):
    versions = await db.versions.find({"song_id": song_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for version in versions:
        if isinstance(version.get("created_at"), str):
            version["created_at"] = datetime.fromisoformat(version["created_at"])
    
    return [Version(**version) for version in versions]

# ---------------------------------------------------------------------------
# Songwriter dictionary tools (synonyms / antonyms / rhymes / translate)
# Bilingual EN+ES, powered by Datamuse (stdlib urllib via run_in_executor) plus
# curated Spanish data and a suffix-based Spanish rhyme engine. See
# dictionary_tools.py. Network failures degrade gracefully to [] (never 500).
# ---------------------------------------------------------------------------

def _resolve_lang(word: str, lang: str | None) -> str:
    lang = (lang or "").lower()
    if lang in ("en", "es"):
        return lang
    return dt.detect_lang(word)


async def _run(fn, *args):
    """Run a blocking dictionary function off the event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, fn, *args)


async def _lookup(kind: str, word: str, lang: str | None):
    """Core resolver shared by every dictionary endpoint.

    Returns {"word", "results", "language", "kind"}. The legacy /synonyms route
    re-maps "results" -> "synonyms" so the existing frontend keeps working.
    """
    word = (word or "").strip()
    if not word:
        return {"word": word, "results": [], "language": "unknown", "kind": kind}

    resolved = _resolve_lang(word, lang)
    cached = dt.cache_get(kind, resolved, word.lower())
    if cached is not None:
        return {"word": word, "results": cached, "language": resolved, "kind": kind}

    results: list = []
    try:
        if kind == "synonyms":
            results = await _run(dt.synonyms_remote, word, resolved)
            if not results and resolved == "es":
                results = dt.SPANISH_SYNONYMS.get(word.lower(), [])
        elif kind == "antonyms":
            results = await _run(dt.antonyms_remote, word, resolved)
            if not results and resolved == "es":
                results = dt.SPANISH_ANTONYMS.get(word.lower(), [])
        elif kind == "rhymes":
            results = await _run(dt.rhymes_remote, word, resolved)
            if resolved == "es" and len(results) < 5:
                # Suffix-based ES fallback so rhymes work where Datamuse is weak.
                merged = list(results) + dt.spanish_rhymes(word)
                results = dt._dedupe(merged)
        elif kind == "translate":
            results = dt.translate_word(word, resolved)
            if not results:
                # Datamuse cross-language: sp= source word, v=target language.
                target = "en" if resolved == "es" else "es"
                results = await _run(
                    lambda w, v: dt._datamuse({"sp": w, "v": v}, 5), word.lower(), target
                )
    except Exception as e:  # never surface a 500 to the panel
        logger.error(f"dictionary {kind} error for '{word}': {e}")
        results = []

    dt.cache_set(kind, resolved, word.lower(), results)
    return {"word": word, "results": results, "language": resolved, "kind": kind}


# Legacy endpoint kept for backward compatibility (frontend reads `.synonyms`).
@api_router.get("/synonyms/{word}")
async def get_synonyms(word: str, lang: str | None = None):
    data = await _lookup("synonyms", word, lang)
    return {"word": data["word"], "synonyms": data["results"], "language": data["language"]}


@api_router.get("/dictionary/synonyms/{word}")
async def dict_synonyms(word: str, lang: str | None = None):
    return await _lookup("synonyms", word, lang)


@api_router.get("/dictionary/antonyms/{word}")
async def dict_antonyms(word: str, lang: str | None = None):
    return await _lookup("antonyms", word, lang)


@api_router.get("/dictionary/rhymes/{word}")
async def dict_rhymes(word: str, lang: str | None = None):
    return await _lookup("rhymes", word, lang)


@api_router.get("/dictionary/translate/{word}")
async def dict_translate(word: str, lang: str | None = None):
    return await _lookup("translate", word, lang)

# ---------------------------------------------------------------------------
# Payments — real Stripe Checkout + Customer Portal + webhook
# ---------------------------------------------------------------------------
STRIPE_NOT_CONFIGURED = "Stripe not configured"


async def _grant_pro(user_doc: dict, subscription_id: Optional[str] = None):
    """Mark a user Pro and award referral credits exactly once. Idempotent."""
    update = {"is_pro": True}
    if subscription_id:
        update["stripe_subscription_id"] = subscription_id
    await db.users.update_one({"id": user_doc["id"]}, {"$set": update})

    already_pro = user_doc.get("is_pro", False)
    referred_by = user_doc.get("referred_by")
    # Only award the referral credit on the transition into Pro (avoid double-paying).
    if referred_by and not already_pro:
        await db.users.update_one(
            {"id": referred_by}, {"$inc": {"credits": 10}}
        )
        await db.credit_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": referred_by,
            "amount": 10,
            "reason": f"Referral upgrade: {user_doc.get('artist_name') or user_doc.get('email')}",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })


@api_router.post("/payments/create-checkout-session")
async def create_checkout_session(request: Request, current_user: User = Depends(get_current_user)):
    stripe = _get_stripe()
    if stripe is None:
        raise HTTPException(status_code=503, detail=STRIPE_NOT_CONFIGURED)
    if not STRIPE_PRICE_ID:
        raise HTTPException(status_code=503, detail=STRIPE_NOT_CONFIGURED)

    # Create or reuse the Stripe Customer for this user.
    customer_id = current_user.stripe_customer_id
    try:
        if not customer_id:
            customer = stripe.Customer.create(
                email=current_user.email,
                name=current_user.artist_name or current_user.legal_name or current_user.email,
                metadata={"user_id": current_user.id},
            )
            customer_id = customer.id
            await db.users.update_one(
                {"id": current_user.id}, {"$set": {"stripe_customer_id": customer_id}}
            )

        base = _base_url(request)
        session = stripe.checkout.Session.create(
            mode="subscription",
            customer=customer_id,
            line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
            client_reference_id=current_user.id,
            metadata={"user_id": current_user.id},
            subscription_data={"metadata": {"user_id": current_user.id}},
            success_url=f"{base}/payment-success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{base}/dashboard",
        )
        return {"url": session.url}
    except Exception as e:  # noqa: BLE001 - surface Stripe errors as 502
        logging.getLogger(__name__).error("Stripe checkout error: %s", e)
        raise HTTPException(status_code=502, detail="Could not create checkout session")


@api_router.post("/payments/portal")
async def create_portal_session(request: Request, current_user: User = Depends(get_current_user)):
    stripe = _get_stripe()
    if stripe is None:
        raise HTTPException(status_code=503, detail=STRIPE_NOT_CONFIGURED)
    if not current_user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No Stripe customer for this user")
    try:
        base = _base_url(request)
        session = stripe.billing_portal.Session.create(
            customer=current_user.stripe_customer_id,
            return_url=f"{base}/dashboard",
        )
        return {"url": session.url}
    except Exception as e:  # noqa: BLE001
        logging.getLogger(__name__).error("Stripe portal error: %s", e)
        raise HTTPException(status_code=502, detail="Could not create portal session")


@api_router.post("/payments/webhook")
async def stripe_webhook(request: Request):
    """Stripe webhook. NO auth — verified via signature. Needs the RAW body."""
    stripe = _get_stripe()
    if stripe is None:
        raise HTTPException(status_code=503, detail=STRIPE_NOT_CONFIGURED)

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    log = logging.getLogger(__name__)

    if STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        except Exception as e:  # noqa: BLE001 - bad signature / malformed payload
            log.warning("Stripe webhook signature verification failed: %s", e)
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        # No signing secret set: still parse but do not trust unsigned events.
        log.warning("STRIPE_WEBHOOK_SECRET not set; rejecting webhook")
        raise HTTPException(status_code=503, detail=STRIPE_NOT_CONFIGURED)

    etype = event["type"]
    obj = event["data"]["object"]

    async def _find_user(o: dict) -> Optional[dict]:
        # Prefer explicit references, fall back to the Stripe customer id.
        uid = o.get("client_reference_id") or (o.get("metadata") or {}).get("user_id")
        if uid:
            u = await db.users.find_one({"id": uid}, {"_id": 0})
            if u:
                return u
        cust = o.get("customer")
        if cust:
            return await db.users.find_one({"stripe_customer_id": cust}, {"_id": 0})
        return None

    try:
        if etype in ("checkout.session.completed", "customer.subscription.created", "customer.subscription.updated"):
            user_doc = await _find_user(obj)
            if user_doc:
                sub_id = obj.get("subscription") if etype == "checkout.session.completed" else obj.get("id")
                # For subscription.updated, only grant Pro when the sub is active/trialing.
                status_ok = True
                if etype == "customer.subscription.updated":
                    status_ok = obj.get("status") in ("active", "trialing", "past_due")
                if status_ok:
                    await _grant_pro(user_doc, sub_id)
                else:
                    await db.users.update_one({"id": user_doc["id"]}, {"$set": {"is_pro": False}})
            else:
                log.warning("Stripe webhook %s: no matching user", etype)
        elif etype == "customer.subscription.deleted":
            user_doc = await _find_user(obj)
            if user_doc:
                await db.users.update_one(
                    {"id": user_doc["id"]}, {"$set": {"is_pro": False, "stripe_subscription_id": None}}
                )
    except Exception as e:  # noqa: BLE001 - never 500 the webhook
        log.error("Stripe webhook handler error (%s): %s", etype, e)

    # Always 200 quickly so Stripe stops retrying.
    return {"received": True}


# Deprecated mock endpoint — the free is_pro flip is removed. Points to the real flow.
@api_router.post("/subscription/upgrade", status_code=410)
async def upgrade_to_pro_deprecated():
    raise HTTPException(
        status_code=410,
        detail="This endpoint is deprecated. Use POST /api/payments/create-checkout-session.",
    )

# Social Network - Discover Users
@api_router.get("/users/discover")
async def discover_users(
    role: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {"id": {"$ne": current_user.id}, "profile_completed": True}
    
    if role:
        query["role"] = role
    
    if search:
        query["$or"] = [
            {"artist_name": {"$regex": search, "$options": "i"}},
            {"legal_name": {"$regex": search, "$options": "i"}}
        ]
    
    users = await db.users.find(
        query,
        {"_id": 0, "password": 0}
    ).limit(50).to_list(50)
    
    for user in users:
        if isinstance(user.get("created_at"), str):
            user["created_at"] = datetime.fromisoformat(user["created_at"])
    
    return [UserPublicProfile(**user) for user in users]

# Get user public profile
@api_router.get("/users/{user_id}/profile")
async def get_user_profile(user_id: str, current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user.get("created_at"), str):
        user["created_at"] = datetime.fromisoformat(user["created_at"])
    
    return UserPublicProfile(**user)

# Messaging - Send message
@api_router.post("/messages/send")
async def send_message(message_data: MessageCreate, current_user: User = Depends(get_current_user)):
    # Check if receiver exists
    receiver = await db.users.find_one({"id": message_data.receiver_id})
    if not receiver:
        raise HTTPException(status_code=404, detail="User not found")
    
    message = Message(
        sender_id=current_user.id,
        receiver_id=message_data.receiver_id,
        content=message_data.content
    )
    
    message_dict = message.model_dump()
    message_dict["created_at"] = message_dict["created_at"].isoformat()
    
    await db.messages.insert_one(message_dict)
    return message

# Get conversations
@api_router.get("/messages/conversations")
async def get_conversations(current_user: User = Depends(get_current_user)):
    # Get all messages where user is sender or receiver
    messages = await db.messages.find({
        "$or": [
            {"sender_id": current_user.id},
            {"receiver_id": current_user.id}
        ]
    }, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Group by conversation partner
    conversations = {}
    for msg in messages:
        if isinstance(msg.get("created_at"), str):
            msg["created_at"] = datetime.fromisoformat(msg["created_at"])
        
        partner_id = msg["receiver_id"] if msg["sender_id"] == current_user.id else msg["sender_id"]
        
        if partner_id not in conversations:
            conversations[partner_id] = {
                "partner_id": partner_id,
                "last_message": msg,
                "unread_count": 0
            }
        
        # Count unread messages
        if msg["receiver_id"] == current_user.id and not msg.get("read", False):
            conversations[partner_id]["unread_count"] += 1
    
    # Get partner details
    partner_ids = list(conversations.keys())
    users = await db.users.find(
        {"id": {"$in": partner_ids}},
        {"_id": 0, "id": 1, "artist_name": 1, "role": 1}
    ).to_list(1000)
    
    user_map = {u["id"]: u for u in users}
    
    result = []
    for partner_id, conv in conversations.items():
        if partner_id in user_map:
            result.append({
                **conv,
                "partner": user_map[partner_id]
            })
    
    return result

# Get messages with specific user
@api_router.get("/messages/{partner_id}")
async def get_messages(partner_id: str, current_user: User = Depends(get_current_user)):
    messages = await db.messages.find({
        "$or": [
            {"sender_id": current_user.id, "receiver_id": partner_id},
            {"sender_id": partner_id, "receiver_id": current_user.id}
        ]
    }, {"_id": 0}).sort("created_at", 1).to_list(1000)
    
    for msg in messages:
        if isinstance(msg.get("created_at"), str):
            msg["created_at"] = datetime.fromisoformat(msg["created_at"])
    
    # Mark messages as read
    await db.messages.update_many(
        {"sender_id": partner_id, "receiver_id": current_user.id, "read": False},
        {"$set": {"read": True}}
    )
    
    return [Message(**msg) for msg in messages]

# Mark message as read
@api_router.patch("/messages/{message_id}/read")
async def mark_message_read(message_id: str, current_user: User = Depends(get_current_user)):
    result = await db.messages.update_one(
        {"id": message_id, "receiver_id": current_user.id},
        {"$set": {"read": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return {"message": "Marked as read"}

# Collaboration Invites
@api_router.post("/invites/send")
async def send_collaboration_invite(invite_data: InviteCreate, current_user: User = Depends(get_current_user)):
    # Check song exists and user has access
    song = await db.songs.find_one({"id": invite_data.song_id})
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    if current_user.id not in song.get("collaborators", []) and song.get("created_by") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check invitee exists
    invitee = await db.users.find_one({"id": invite_data.invitee_id})
    if not invitee:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create invite
    invite = CollaborationInvite(
        song_id=invite_data.song_id,
        inviter_id=current_user.id,
        invitee_id=invite_data.invitee_id,
        message=invite_data.message
    )
    
    invite_dict = invite.model_dump()
    invite_dict["created_at"] = invite_dict["created_at"].isoformat()
    
    await db.collaboration_invites.insert_one(invite_dict)
    
    # Also send a message
    message = Message(
        sender_id=current_user.id,
        receiver_id=invite_data.invitee_id,
        content=f"🎵 Collaboration Invite: {song['title']}\n\n{invite_data.message}\n\nCheck your invites to accept!"
    )
    
    message_dict = message.model_dump()
    message_dict["created_at"] = message_dict["created_at"].isoformat()
    await db.messages.insert_one(message_dict)
    
    return invite

@api_router.get("/invites")
async def get_invites(current_user: User = Depends(get_current_user)):
    invites = await db.collaboration_invites.find(
        {"invitee_id": current_user.id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    for invite in invites:
        if isinstance(invite.get("created_at"), str):
            invite["created_at"] = datetime.fromisoformat(invite["created_at"])
    
    # Get song and inviter details
    for invite in invites:
        song = await db.songs.find_one({"id": invite["song_id"]}, {"_id": 0, "title": 1})
        inviter = await db.users.find_one(
            {"id": invite["inviter_id"]}, 
            {"_id": 0, "artist_name": 1, "role": 1}
        )
        invite["song"] = song
        invite["inviter"] = inviter
    
    return invites

@api_router.post("/invites/{invite_id}/accept")
async def accept_invite(invite_id: str, current_user: User = Depends(get_current_user)):
    invite = await db.collaboration_invites.find_one({"id": invite_id, "invitee_id": current_user.id})
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    if invite["status"] != "pending":
        raise HTTPException(status_code=400, detail="Invite already processed")
    
    # Add user to song collaborators
    await db.songs.update_one(
        {"id": invite["song_id"]},
        {"$addToSet": {"collaborators": current_user.id}}
    )
    
    # Update invite status
    await db.collaboration_invites.update_one(
        {"id": invite_id},
        {"$set": {"status": "accepted"}}
    )
    
    return {"message": "Invite accepted", "song_id": invite["song_id"]}

@api_router.post("/invites/{invite_id}/decline")
async def decline_invite(invite_id: str, current_user: User = Depends(get_current_user)):
    invite = await db.collaboration_invites.find_one({"id": invite_id, "invitee_id": current_user.id})
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    await db.collaboration_invites.update_one(
        {"id": invite_id},
        {"$set": {"status": "declined"}}
    )
    
    return {"message": "Invite declined"}

# Referral system
@api_router.get("/referrals/stats")
async def get_referral_stats(current_user: User = Depends(get_current_user)):
    # Count referred users
    referred_users = await db.users.count_documents({"referred_by": current_user.id})
    
    # Count referred Pro users
    referred_pro = await db.users.count_documents({"referred_by": current_user.id, "is_pro": True})
    
    # Get credit transactions
    transactions = await db.credit_transactions.find(
        {"user_id": current_user.id},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "referral_code": current_user.referral_code,
        "total_referrals": referred_users,
        "pro_referrals": referred_pro,
        "credits": current_user.credits,
        "recent_transactions": transactions
    }

# Export PDF
@api_router.get("/export/split-sheet/{proposal_id}")
async def export_split_sheet(proposal_id: str, current_user: User = Depends(get_current_user)):
    if not current_user.is_pro:
        raise HTTPException(status_code=403, detail="Pro plan required")
    
    proposal = await db.split_proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    song = await db.songs.find_one({"id": proposal["song_id"]}, {"_id": 0})
    signatures = await db.signatures.find({"split_proposal_id": proposal_id}, {"_id": 0}).to_list(1000)
    
    user_ids = [s["user_id"] for s in proposal["splits"]]
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0}).to_list(1000)
    user_map = {u["id"]: u for u in users}
    sig_map = {s["user_id"]: s for s in signatures}

    def _display_name(user: dict) -> str:
        return (
            user.get("legal_name")
            or user.get("artist_name")
            or user.get("email")
            or "Unknown Writer"
        )

    # --- Signature / status state -----------------------------------------
    all_signed = len(sig_map) >= len(proposal["splits"]) and len(proposal["splits"]) > 0
    status = proposal.get("status", "draft")

    # --- Tamper-evident hash ----------------------------------------------
    canonical_parts = [str(proposal["id"])]
    for split in sorted(proposal["splits"], key=lambda s: str(s.get("user_id", ""))):
        canonical_parts.append(f"{split.get('user_id')}:{split.get('percentage')}")
    for uid in sorted(sig_map.keys()):
        sig = sig_map[uid]
        canonical_parts.append(f"{uid}:{sig.get('signature_data', '')}:{sig.get('signed_at', '')}")
    canonical = "|".join(canonical_parts)
    doc_hash = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    short_hash = doc_hash[:16]

    generated_at = datetime.now(timezone.utc).isoformat()

    # --- Styles -----------------------------------------------------------
    styles = getSampleStyleSheet()
    wordmark_style = ParagraphStyle(
        "Wordmark", parent=styles["Title"], fontName="Helvetica-Bold",
        fontSize=26, textColor=colors.white, leading=30, alignment=TA_LEFT,
    )
    doctitle_style = ParagraphStyle(
        "DocTitle", parent=styles["Normal"], fontName="Helvetica-Bold",
        fontSize=13, textColor=colors.HexColor("#FFB800"), leading=16,
        alignment=TA_LEFT, spaceBefore=2,
    )
    section_style = ParagraphStyle(
        "Section", parent=styles["Heading2"], fontName="Helvetica-Bold",
        fontSize=12, textColor=colors.HexColor("#111111"), spaceBefore=14,
        spaceAfter=6,
    )
    meta_style = ParagraphStyle(
        "Meta", parent=styles["Normal"], fontName="Helvetica", fontSize=9,
        textColor=colors.HexColor("#333333"), leading=14,
    )
    cell_style = ParagraphStyle(
        "Cell", parent=styles["Normal"], fontName="Helvetica", fontSize=9,
        leading=11,
    )
    legal_style = ParagraphStyle(
        "Legal", parent=styles["Normal"], fontName="Helvetica", fontSize=8,
        textColor=colors.HexColor("#444444"), leading=11, alignment=TA_LEFT,
        spaceBefore=8,
    )

    # --- Header band (drawn as a full-width table) ------------------------
    header_inner = Table(
        [[Paragraph("EL PROFE", wordmark_style),
          Paragraph("SPLIT SHEET", doctitle_style)]],
        colWidths=[3.5 * inch, 3.0 * inch],
    )
    header_inner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#050505")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 16),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
    ]))

    # --- Metadata block ---------------------------------------------------
    meta_rows = [
        [Paragraph("<b>Document ID:</b>", meta_style), Paragraph(str(proposal["id"]), meta_style)],
        [Paragraph("<b>Song Title:</b>", meta_style), Paragraph(str(song.get("title", "Untitled")), meta_style)],
        [Paragraph("<b>Version:</b>", meta_style), Paragraph(str(proposal.get("version", 1)), meta_style)],
        [Paragraph("<b>Date Generated:</b>", meta_style), Paragraph(generated_at, meta_style)],
        [Paragraph("<b>Status:</b>", meta_style),
         Paragraph(("FULLY EXECUTED" if all_signed else status.upper() + " (UNSIGNED)"), meta_style)],
    ]
    meta_table = Table(meta_rows, colWidths=[1.4 * inch, 5.1 * inch])
    meta_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ]))

    # --- Writers table ----------------------------------------------------
    writer_header = [
        Paragraph("<b>Writer (Legal Name)</b>", cell_style),
        Paragraph("<b>Artist Name</b>", cell_style),
        Paragraph("<b>PRO</b>", cell_style),
        Paragraph("<b>Role</b>", cell_style),
        Paragraph("<b>Split %</b>", cell_style),
    ]
    writer_rows = [writer_header]
    total_pct = 0.0
    for split in proposal["splits"]:
        user = user_map.get(split["user_id"], {})
        pct = split.get("percentage", 0) or 0
        try:
            total_pct += float(pct)
        except (TypeError, ValueError):
            pass
        role = user.get("role") or (", ".join(user.get("roles", [])) if user.get("roles") else "—")
        writer_rows.append([
            Paragraph(_display_name(user), cell_style),
            Paragraph(str(user.get("artist_name") or "—"), cell_style),
            Paragraph(str(user.get("pro_affiliation") or "—"), cell_style),
            Paragraph(str(role), cell_style),
            Paragraph(f"{pct}%", cell_style),
        ])
    total_disp = int(total_pct) if float(total_pct).is_integer() else round(total_pct, 2)
    writer_rows.append([
        Paragraph("<b>TOTAL</b>", cell_style), "", "", "",
        Paragraph(f"<b>{total_disp}%</b>", cell_style),
    ])
    writers_table = Table(
        writer_rows,
        colWidths=[1.9 * inch, 1.5 * inch, 1.0 * inch, 1.1 * inch, 1.0 * inch],
    )
    writers_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#050505")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#999999")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#f5f5f5")]),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#FFF4D6")),
        ("SPAN", (0, -1), (3, -1)),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))

    # --- Signatures table -------------------------------------------------
    sig_header = [
        Paragraph("<b>Writer</b>", cell_style),
        Paragraph("<b>Signature</b>", cell_style),
        Paragraph("<b>Signed At (UTC)</b>", cell_style),
    ]
    sig_rows = [sig_header]
    for split in proposal["splits"]:
        user = user_map.get(split["user_id"], {})
        name = _display_name(user)
        sig = sig_map.get(split["user_id"])
        if sig:
            sig_text = f"/s/ {sig.get('signature_data') or name}"
            signed_at = str(sig.get("signed_at", ""))
        else:
            sig_text = "PENDING"
            signed_at = "—"
        sig_rows.append([
            Paragraph(name, cell_style),
            Paragraph(sig_text, cell_style),
            Paragraph(signed_at, cell_style),
        ])
    sig_table = Table(sig_rows, colWidths=[2.2 * inch, 2.5 * inch, 1.8 * inch])
    sig_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#050505")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#999999")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f5f5")]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))

    # --- Legal clause -----------------------------------------------------
    legal_text = (
        "The undersigned writers hereby agree that the percentages set forth above "
        "accurately represent each writer's respective ownership share of the musical "
        "composition identified in this document. Any contribution or character-level "
        "tracking data referenced by the El Profe platform is provided solely as "
        "decision-support information and does not itself determine or bind these "
        "ownership percentages, which are established exclusively by mutual agreement of "
        "the writers. This split sheet becomes fully executed only when every listed "
        "writer has signed; until then it constitutes a non-binding draft. Each signatory "
        "represents that they are authorized to enter into this agreement with respect to "
        "their contribution to the composition."
    )

    # --- Build document ---------------------------------------------------
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        leftMargin=0.75 * inch, rightMargin=0.75 * inch,
        topMargin=0.6 * inch, bottomMargin=0.7 * inch,
        title=f"Split Sheet - {song.get('title', '')}",
    )

    story = [
        header_inner,
        Spacer(1, 16),
        meta_table,
        Paragraph("Writers &amp; Splits", section_style),
        writers_table,
        Paragraph("Signatures", section_style),
        sig_table,
        Paragraph("Agreement", section_style),
        Paragraph(legal_text, legal_style),
    ]

    doc_id = str(proposal["id"])

    def _draw_overlays(canvas_obj, doc_obj):
        # Tamper-evident footer on every page.
        canvas_obj.saveState()
        canvas_obj.setFont("Helvetica", 7)
        canvas_obj.setFillColor(colors.HexColor("#777777"))
        footer_y = 0.4 * inch
        canvas_obj.drawString(
            0.75 * inch, footer_y,
            f"Doc ID: {doc_id}  |  SHA-256: {short_hash}…",
        )
        canvas_obj.drawRightString(
            letter[0] - 0.75 * inch, footer_y,
            f"Page {doc_obj.page}",
        )
        canvas_obj.restoreState()

        # DRAFT watermark only while not fully signed.
        if not all_signed:
            canvas_obj.saveState()
            canvas_obj.setFont("Helvetica-Bold", 110)
            canvas_obj.setFillColor(colors.HexColor("#E0E0E0"))
            canvas_obj.translate(letter[0] / 2, letter[1] / 2)
            canvas_obj.rotate(45)
            canvas_obj.drawCentredString(0, 0, "DRAFT")
            canvas_obj.restoreState()

    doc.build(story, onFirstPage=_draw_overlays, onLaterPages=_draw_overlays)

    buffer.seek(0)
    pdf_base64 = base64.b64encode(buffer.getvalue()).decode()

    return {"pdf": pdf_base64, "filename": f"split-sheet-{song['title']}.pdf"}

# WebSocket
@app.websocket("/ws/song/{song_id}")
async def websocket_endpoint(websocket: WebSocket, song_id: str):
    await manager.connect(websocket, song_id)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.broadcast(data, song_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, song_id)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# ---------------------------------------------------------------------------
# Serve the built React frontend (single-origin, so a tunnel needs only :8000).
# Registered AFTER the API router so /api/* and /ws/* always match first.
# ---------------------------------------------------------------------------
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

_BUILD_DIR = Path(__file__).resolve().parent.parent / "frontend" / "build"
if _BUILD_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(_BUILD_DIR / "static")), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        candidate = _BUILD_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(_BUILD_DIR / "index.html"))