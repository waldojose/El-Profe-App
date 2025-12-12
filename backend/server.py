from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends, status
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
import io
import base64

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
    role: Optional[str] = None
    country: Optional[str] = None
    pro_affiliation: Optional[str] = None
    is_pro: bool = False
    bio: Optional[str] = None
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
    if not current_user.is_pro:
        raise HTTPException(status_code=403, detail="Pro plan required")
    
    signature = Signature(
        split_proposal_id=sig_data.split_proposal_id,
        user_id=current_user.id,
        signature_data=sig_data.signature_data
    )
    
    sig_dict = signature.model_dump()
    sig_dict["signed_at"] = sig_dict["signed_at"].isoformat()
    
    await db.signatures.insert_one(sig_dict)
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

# Synonyms tool - using Datamuse API (English) and Spanish fallback
@api_router.get("/synonyms/{word}")
async def get_synonyms(word: str):
    try:
        import requests
        
        # Try English first with Datamuse API
        response = requests.get(f"https://api.datamuse.com/words", params={
            "rel_syn": word.lower(),
            "max": 20
        }, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            synonyms = [item["word"] for item in data[:15]]
            
            # If we got English results, return them
            if synonyms:
                return {"word": word, "synonyms": synonyms, "language": "en"}
        
        # If no English results, try Spanish dictionary
        spanish_synonyms = {
            "amor": ["cariño", "afecto", "pasión", "ternura", "adoración", "devoción"],
            "corazón": ["alma", "espíritu", "sentimiento", "pecho", "centro"],
            "noche": ["oscuridad", "anochecer", "medianoche", "madrugada", "tarde"],
            "sueño": ["ensueño", "ilusión", "fantasía", "deseo", "anhelo", "aspiración"],
            "música": ["melodía", "armonía", "sonido", "canción", "ritmo", "compás"],
            "luz": ["brillo", "resplandor", "claridad", "luminosidad", "fulgor"],
            "dolor": ["sufrimiento", "pena", "angustia", "tormento", "aflicción"],
            "feliz": ["alegre", "contento", "dichoso", "radiante", "jubiloso"],
            "triste": ["melancólico", "apenado", "afligido", "sombrío", "deprimido"],
            "tiempo": ["momento", "época", "periodo", "instante", "era"],
            "vida": ["existencia", "vivencia", "experiencia", "aliento", "espíritu"],
            "muerte": ["fin", "fallecimiento", "deceso", "término", "pérdida"],
            "cielo": ["firmamento", "paraíso", "inmensidad", "bóveda celeste"],
            "tierra": ["suelo", "mundo", "planeta", "patria", "terreno"],
            "fuego": ["llama", "ardor", "pasión", "calor", "incendio"],
            "agua": ["líquido", "fluido", "corriente", "caudal", "río"],
            "viento": ["aire", "brisa", "soplo", "corriente", "ráfaga"],
            "sol": ["astro", "estrella", "luz solar", "claridad", "brillo"],
            "luna": ["satélite", "astro nocturno", "plenilunio", "menguante"],
            "estrella": ["astro", "lucero", "estrellita", "luminaria"],
            "palabra": ["término", "vocablo", "expresión", "voz", "promesa"],
            "silencio": ["quietud", "calma", "paz", "mutismo", "sosiego"],
            "voz": ["sonido", "tono", "timbre", "palabra", "grito"],
            "canción": ["melodía", "tema", "balada", "canto", "tonada"],
            "bailar": ["danzar", "moverse", "girar", "valsar", "menear"],
            "besar": ["dar un beso", "acariciar", "rozar", "tocar"],
            "abrazar": ["estrechar", "rodear", "envolver", "apretar"],
            "llorar": ["lagrimear", "sollozar", "gemir", "lamentarse"],
            "reír": ["carcajear", "sonreír", "desternillarse", "alegrar"],
            "caminar": ["andar", "pasear", "marchar", "transitar", "deambular"],
            "correr": ["trotar", "galopar", "apresurarse", "acelerar"],
            "dormir": ["descansar", "reposar", "yacer", "adormecerse"],
            "despertar": ["despertarse", "levantarse", "abrir los ojos"],
            "comer": ["alimentarse", "ingerir", "degustar", "devorar"],
            "beber": ["tomar", "ingerir", "libar", "sorber", "tragar"],
            "escribir": ["redactar", "componer", "anotar", "plasmar"],
            "leer": ["ojear", "repasar", "estudiar", "descifrar"],
            "pensar": ["reflexionar", "meditar", "considerar", "razonar"],
            "sentir": ["percibir", "experimentar", "notar", "vivir"],
            "mirar": ["observar", "contemplar", "ver", "ojear", "divisar"],
            "escuchar": ["oír", "atender", "percibir", "captar"],
            "hablar": ["conversar", "charlar", "dialogar", "platicar"],
            "gritar": ["vociferar", "chillar", "bramar", "aullar"],
            "cantar": ["entonar", "interpretar", "tararear", "vocalizar"],
            "tocar": ["palpar", "acariciar", "rozar", "tantear"],
            "buscar": ["indagar", "investigar", "rastrear", "explorar"],
            "encontrar": ["hallar", "localizar", "descubrir", "topar"],
            "perder": ["extraviar", "olvidar", "desaprovechar"],
            "ganar": ["obtener", "conseguir", "lograr", "alcanzar"],
            "dar": ["entregar", "otorgar", "conceder", "ofrecer", "regalar"],
            "recibir": ["obtener", "aceptar", "tomar", "adquirir"],
            "tener": ["poseer", "contar con", "disponer", "portar"],
            "querer": ["amar", "desear", "anhelar", "adorar", "apreciar"],
            "poder": ["capacidad", "fuerza", "autoridad", "dominio"],
            "saber": ["conocer", "entender", "comprender", "dominar"],
            "hacer": ["realizar", "ejecutar", "crear", "efectuar", "fabricar"],
            "ir": ["marchar", "dirigirse", "trasladarse", "partir"],
            "venir": ["llegar", "acercarse", "aproximarse", "arribar"],
            "estar": ["hallarse", "encontrarse", "permanecer", "situarse"],
            "ser": ["existir", "constituir", "representar"],
            "ver": ["observar", "mirar", "contemplar", "divisar", "percibir"],
            "decir": ["expresar", "manifestar", "comunicar", "declarar"],
            "bello": ["hermoso", "bonito", "lindo", "precioso", "bello"],
            "feo": ["horrible", "desagradable", "repulsivo", "antiestético"],
            "grande": ["enorme", "vasto", "inmenso", "gigantesco", "colosal"],
            "pequeño": ["diminuto", "chico", "reducido", "minúsculo"],
            "bueno": ["óptimo", "excelente", "magnífico", "extraordinario"],
            "malo": ["pésimo", "negativo", "perjudicial", "nocivo"],
            "nuevo": ["reciente", "moderno", "actual", "novato", "fresco"],
            "viejo": ["antiguo", "anciano", "añejo", "veterano", "usado"],
            "joven": ["juvenil", "mozo", "adolescente", "muchacho"],
            "rápido": ["veloz", "presto", "ligero", "acelerado", "raudo"],
            "lento": ["pausado", "tranquilo", "moroso", "perezoso"],
            "fuerte": ["robusto", "potente", "vigoroso", "poderoso"],
            "débil": ["frágil", "endeble", "flojo", "delicado"]
        }
        
        word_lower = word.lower()
        if word_lower in spanish_synonyms:
            return {"word": word, "synonyms": spanish_synonyms[word_lower], "language": "es"}
        
        # No results in either language
        return {"word": word, "synonyms": [], "language": "unknown"}
        
    except Exception as e:
        logger.error(f"Error fetching synonyms: {e}")
        return {"word": word, "synonyms": [], "language": "error"}

# Subscription
@api_router.post("/subscription/upgrade")
async def upgrade_to_pro(current_user: User = Depends(get_current_user)):
    await db.users.update_one({"id": current_user.id}, {"$set": {"is_pro": True}})
    
    # Give credits to referrer if user was referred
    if current_user.referred_by:
        await db.users.update_one(
            {"id": current_user.referred_by},
            {"$inc": {"credits": 10}}  # Give 10 credits for Pro upgrade
        )
        
        # Log the credit transaction
        await db.credit_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user.referred_by,
            "amount": 10,
            "reason": f"Referral upgrade: {current_user.artist_name or current_user.email}",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"message": "Upgraded to Pro", "is_pro": True}

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
    
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    p.setFont("Helvetica-Bold", 24)
    p.drawString(100, 750, "Professor App")
    p.setFont("Helvetica-Bold", 18)
    p.drawString(100, 720, "SPLIT SHEET")
    
    p.setFont("Helvetica", 12)
    y = 680
    p.drawString(100, y, f"Song: {song['title']}")
    y -= 20
    p.drawString(100, y, f"Created: {proposal.get('created_at', '')}")
    y -= 20
    p.drawString(100, y, f"Version: {proposal['version']}")
    y -= 40
    
    p.setFont("Helvetica-Bold", 14)
    p.drawString(100, y, "SPLIT PERCENTAGES")
    y -= 30
    
    for split in proposal["splits"]:
        user = user_map.get(split["user_id"], {})
        p.setFont("Helvetica", 11)
        p.drawString(120, y, f"{user.get('legal_name', 'Unknown')} ({user.get('artist_name', '')})")
        y -= 15
        p.drawString(140, y, f"Split: {split['percentage']}%")
        y -= 15
        p.drawString(140, y, f"PRO: {user.get('pro_affiliation', 'N/A')}")
        y -= 25
    
    if signatures:
        y -= 20
        p.setFont("Helvetica-Bold", 14)
        p.drawString(100, y, "SIGNATURES")
        y -= 25
        for sig in signatures:
            user = user_map.get(sig["user_id"], {})
            p.setFont("Helvetica", 11)
            p.drawString(120, y, f"{user.get('legal_name', 'Unknown')}: {sig['signature_data']}")
            y -= 20
    
    p.showPage()
    p.save()
    
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