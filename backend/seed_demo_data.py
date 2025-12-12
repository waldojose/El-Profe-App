import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from datetime import datetime, timezone
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'test_database')

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

async def seed_demo_data():
    print("🌱 Seeding demo data...")
    
    # Create 3 demo users
    demo_users = [
        {
            "id": str(uuid.uuid4()),
            "email": "writer1@demo.com",
            "password": pwd_context.hash("Demo123!"),
            "legal_name": "Sarah Johnson",
            "artist_name": "S. Johnson",
            "country": "United States",
            "pro_affiliation": "BMI",
            "publisher": "Johnson Music Publishing",
            "role": "writer",
            "is_pro": True,
            "profile_completed": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "email": "producer1@demo.com",
            "password": pwd_context.hash("Demo123!"),
            "legal_name": "Michael Chen",
            "artist_name": "M. Chen",
            "country": "United States",
            "pro_affiliation": "ASCAP",
            "publisher": None,
            "role": "producer",
            "is_pro": True,
            "profile_completed": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "email": "composer1@demo.com",
            "password": pwd_context.hash("Demo123!"),
            "legal_name": "Emily Rodriguez",
            "artist_name": "E. Rodriguez",
            "country": "United States",
            "pro_affiliation": "SESAC",
            "publisher": "Rodriguez Studios",
            "role": "composer",
            "is_pro": False,
            "profile_completed": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Check if demo users already exist
    existing_user = await db.users.find_one({"email": "writer1@demo.com"})
    
    if existing_user:
        print("⚠️  Demo users already exist, fetching existing users...")
        demo_users_from_db = await db.users.find(
            {"email": {"$in": ["writer1@demo.com", "producer1@demo.com", "composer1@demo.com"]}},
            {"_id": 0}
        ).to_list(10)
        demo_users = demo_users_from_db
    else:
        print("✅ Creating demo users...")
        await db.users.insert_many(demo_users)
    
    user_ids = [u["id"] for u in demo_users]
    
    # Create a collaborative song
    demo_song = {
        "id": str(uuid.uuid4()),
        "title": "Midnight Dreams (Demo Song)",
        "content": """[Verse 1 - Sarah]
In the silence of the night, I hear your voice
Echoing through memories, I had no choice
Every word you said still haunts my mind
Searching for the love we left behind

[Pre-Chorus - Michael]
Time keeps moving, but my heart stands still
Caught between the memory and the thrill

[Chorus - All]
We were midnight dreams, burning bright
Dancing in the shadows, holding tight
Now the morning comes and steals away
Everything we were yesterday

[Verse 2 - Emily]
Your photograph still sits beside my bed
A frozen moment of the things we never said
I trace the outline of your smile so sweet
Wishing I could turn back time, press repeat

[Bridge - All]
Maybe in another life, another time
We'll find our way back, you and I
But for now I'll keep these midnight dreams
Alive in melodies and silent screams

[Final Chorus - All]
We were midnight dreams, burning bright
Dancing in the shadows, holding tight
Now the morning comes and steals away
Everything we were yesterday
Everything we were yesterday""",
        "created_by": user_ids[0],
        "collaborators": user_ids,
        "is_locked": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Check if demo song exists
    existing_song = await db.songs.find_one({"title": "Midnight Dreams (Demo Song)"})
    
    if existing_song:
        print("⚠️  Demo song already exists")
        song_id = existing_song["id"]
    else:
        print("✅ Creating demo collaborative song...")
        await db.songs.insert_one(demo_song)
        song_id = demo_song["id"]
    
    # Create contribution logs for the demo song
    contributions = [
        {
            "id": str(uuid.uuid4()),
            "song_id": song_id,
            "user_id": user_ids[0],  # Sarah
            "action": "insert",
            "content": "Verse 1 and partial chorus",
            "position": 0,
            "chars_added": 250,
            "chars_deleted": 0,
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "song_id": song_id,
            "user_id": user_ids[1],  # Michael
            "action": "insert",
            "content": "Pre-chorus and production notes",
            "position": 250,
            "chars_added": 180,
            "chars_deleted": 0,
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "song_id": song_id,
            "user_id": user_ids[2],  # Emily
            "action": "insert",
            "content": "Verse 2 and bridge",
            "position": 430,
            "chars_added": 220,
            "chars_deleted": 0,
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "song_id": song_id,
            "user_id": user_ids[0],  # Sarah
            "action": "insert",
            "content": "Final chorus refinement",
            "position": 650,
            "chars_added": 120,
            "chars_deleted": 15,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Check if contributions exist
    existing_contrib = await db.contributions.find_one({"song_id": song_id})
    
    if not existing_contrib:
        print("✅ Creating contribution logs...")
        await db.contributions.insert_many(contributions)
    else:
        print("⚠️  Contribution logs already exist")
    
    # Create a split proposal
    split_proposal = {
        "id": str(uuid.uuid4()),
        "song_id": song_id,
        "splits": [
            {"user_id": user_ids[0], "percentage": 40.0},  # Sarah - main writer
            {"user_id": user_ids[1], "percentage": 35.0},  # Michael - producer
            {"user_id": user_ids[2], "percentage": 25.0}   # Emily - composer
        ],
        "proposed_by": user_ids[0],
        "status": "draft",
        "version": 1,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Check if split proposal exists
    existing_split = await db.split_proposals.find_one({"song_id": song_id})
    
    if not existing_split:
        print("✅ Creating split proposal...")
        await db.split_proposals.insert_one(split_proposal)
    else:
        print("⚠️  Split proposal already exists")
    
    print("\n" + "="*50)
    print("🎉 Demo data seeded successfully!")
    print("="*50)
    print("\n📧 Demo User Credentials:")
    print("-" * 50)
    print("1️⃣  Writer (Pro User):")
    print("   Email: writer1@demo.com")
    print("   Password: Demo123!")
    print("   Name: Sarah Johnson")
    print()
    print("2️⃣  Producer (Pro User):")
    print("   Email: producer1@demo.com")
    print("   Password: Demo123!")
    print("   Name: Michael Chen")
    print()
    print("3️⃣  Composer (Free User):")
    print("   Email: composer1@demo.com")
    print("   Password: Demo123!")
    print("   Name: Emily Rodriguez")
    print("-" * 50)
    print("\n🎵 Demo Song Created:")
    print("   Title: Midnight Dreams (Demo Song)")
    print("   Collaborators: All 3 users above")
    print("   Contribution logs: ✅")
    print("   Split proposal: ✅ (40% / 35% / 25%)")
    print("\n💡 Login with any demo account to see the collaborative song!")
    print("="*50)

if __name__ == "__main__":
    asyncio.run(seed_demo_data())
