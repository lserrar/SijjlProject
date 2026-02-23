import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / '.env')

async def check_db():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Count audios
    total_audios = await db.audios.count_documents({})
    
    # Count audios with module_id
    with_module = await db.audios.count_documents({'module_id': {'$exists': True, '$ne': None, '$ne': ''}})
    
    # Get sample audios
    samples = await db.audios.find({}, {'_id': 0, 'id': 1, 'title': 1, 'module_id': 1, 'file_key': 1}).limit(5).to_list(5)
    
    # Check Henry Corbin
    corbin = await db.audios.find({'id': {'$regex': 'corbin'}}, {'_id': 0, 'id': 1, 'title': 1}).to_list(10)
    aud_corbin = await db.audios.find({'id': {'$regex': 'aud-corbin'}}, {'_id': 0, 'id': 1}).to_list(10)
    
    # Check specific module ID from test spec
    mod1_audios = await db.audios.find({'module_id': 'cours-falsafa-grands-mod-1'}, {'_id': 0, 'id': 1, 'title': 1, 'file_key': 1}).to_list(10)
    
    # Check modules
    mod_count = await db.modules.count_documents({})
    falsafa_mods = await db.modules.find({'course_id': 'cours-falsafa-grands'}, {'_id': 0, 'id': 1, 'name': 1, 'is_active': 1}).to_list(20)
    
    # Check cursus
    cursus_count = await db.cursus.count_documents({})
    cursus = await db.cursus.find({}, {'_id': 0, 'id': 1, 'name': 1, 'is_active': 1}).to_list(20)
    
    # Check specific audio
    aud_mod1 = await db.audios.find_one({'id': 'aud_cours-falsafa-grands-mod-1'}, {'_id': 0})
    
    print(f'Total audios: {total_audios}')
    print(f'Audios with module_id: {with_module}')
    print(f'Corbin regex matches: {corbin}')
    print(f'aud-corbin matches: {aud_corbin}')
    print(f'Audios for cours-falsafa-grands-mod-1: {mod1_audios}')
    print(f'Total modules: {mod_count}')
    print(f'Modules for cours-falsafa-grands: {falsafa_mods}')
    print(f'Cursus count: {cursus_count}')
    print(f'Cursus: {cursus}')
    print(f'Audio aud_cours-falsafa-grands-mod-1: {aud_mod1}')

asyncio.run(check_db())
