"""
Script to sync Sijill modules with R2 audio files and create audio entries.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
import re

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = 'test_database'

# Mapping between R2 folder names and module names
R2_TO_MODULE_MAPPING = {
    # Cursus A - Falsafa
    "01-mouvement-traduction": "Le mouvement de traduction du grec à l'arabe",
    "02-falsafa/al-kindi": "Al-Kindī",
    "02-falsafa/al-farabi": "Al-Fārābī",
    "02-falsafa/avicenne": "Avicenne",
    "02-falsafa/avicenne-monde-latin": "Avicenne dans le monde latin",
    "02-falsafa/disciples-avicenne": "Bahmanyār Ibn al-Marzubān",
    "03-post-avicennisme/al-ghazali": "Al-Ghazālī",
    "03-post-avicennisme/al-ghazali-occident-latin": "La réception de Ghazālī",
    "03-post-avicennisme/nasir-al-din-al-tusi": "Naṣīr al-Dīn al-Ṭūsī",
    "03-post-avicennisme/fakhr-al-din-al-razi": "Fakhr al-Dīn al-Rāzī",
    "04-falsafa-occident-musulman/ibn-bajja": "Ibn Bājja",
    "04-falsafa-occident-musulman/ibn-tufayl": "Ibn Ṭufayl",
    "04-falsafa-occident-musulman/averroes": "Ibn Rushd",
    "04-falsafa-occident-musulman/posterite-latine-averroes": "La postérité latine",
    "05-renouveau-falsafa-persan/suhrawardi": "Suhrawardī",
    "05-renouveau-falsafa-persan/shahrazuri": "Shahrazūrī",
    "05-renouveau-falsafa-persan/ibn-kammuna": "Ibn Kammunā",
    "05-renouveau-falsafa-persan/mir-fendereski": "Mīr Fendereskī",
    "05-renouveau-falsafa-persan/shaykh-bahai": "Bahāʾ al-Dīn",
    "05-renouveau-falsafa-persan/mir-damad": "Mīr Dāmād",
    "06-logique-arabe": "Histoire de la logique arabe",
    "07-inclassables/ibn-hazm": "Ibn Ḥazm",
    "07-inclassables/ibn-khaldun-philosophie": "Ibn Khaldūn",
    "07-inclassables/al-amiri": "Abū l-Ḥasan al-ʿĀmirī",
    "07-inclassables/miskawayh": "Miskawayh",
    "07-inclassables/abu-al-barakat": "Abū l-Barakāt",
    # Cursus B - Théologie et Droit
    "08-kalam/avant-mutazilisme": "Kalām — Avant le mu'tazilisme",
    "08-kalam/phase-intermediaire": "Kalām — Phase intermédiaire",
    "08-kalam/kalam-tardif": "Kalām — Époque post-classique",
    "08-kalam/ibn-taymiyya": "Ibn Taymiyya",
    "09-usul-al-fiqh/quatre-ecoles": "Histoire des quatre écoles",
    "09-usul-al-fiqh/droit-musulman": "Droit musulman",
    # Cursus C - Sciences islamiques
    "10-doxographie/ibn-al-nadim": "Ibn al-Nadīm",
    "10-doxographie/hajji-khalifa": "Ḥājjī Khalīfa",
    "10-doxographie/tashkoprizade": "Ṭāshköprīzāde",
    "11-transmission-coran": "Transmission du Coran",
    "12-transmission-hadith/chiisme": "Hadith dans le chiisme",
    "12-transmission-hadith/sunnisme": "Hadith dans le sunnisme",
    "13-historiographie/ibn-battuta": "Ibn Baṭṭūṭa",
    "13-historiographie/ibn-khaldun-histoire": "Ibn Khaldūn",
    "13-historiographie/al-maqrizi": "Al-Maqrīzī",
    "13-historiographie/al-tabari": "Al-Ṭabarī",
    "13-historiographie/ibn-kathir": "Ibn Kathīr",
    "14-autobiographies": "Autobiographies islamiques",
    # Cursus D - Arts
    "15-histoire-art": "Histoire de l'art islamique",
    "16-poesie/monde-preislamique": "Poésie dans le monde préislamique",
    "16-poesie/monde-arabe": "Poésie dans le monde arabe",
    "16-poesie/monde-persan": "Poésie dans le monde persan",
    "18-sciences/biologie": "Biologie islamique",
    "18-sciences/al-jahiz": "Al-Jāḥiẓ",
    "18-sciences/astronomie": "Astronomie islamique",
    "18-sciences/mathematiques": "Mathématiques islamiques",
    # Cursus E - Spiritualités
    "19-kalam-chretien/yahya-ibn-adi": "Yaḥyā ibn ʿAdī",
    "19-kalam-chretien/thabit-ibn-qurra": "Thābit ibn Qurra",
    "20-mystique-islamique/premier-tasawwuf": "Le premier taṣawwuf",
    "20-mystique-islamique/ibn-arabi": "Ibn ʿArabī",
    "20-mystique-islamique/soufisme-iranien": "Le soufisme iranien",
    "20-mystique-islamique/nafisi": "Nafisi",
    "20-mystique-islamique/soufisme-philosophie": "Soufisme et philosophie",
    "21-ismaelisme/histoire": "Histoire de l'ismaélisme",
    "21-ismaelisme/philosophie": "Philosophie ismaélienne",
    "22-philosophie-juive/dawud-al-muqammis": "Dāwūd ibn Marwān",
    "22-philosophie-juive/bahya-ibn-paquda": "Baḥya ibn Paqūda",
    "22-philosophie-juive/abraham-ibn-daud": "Abraham ibn Daud",
}

async def sync_audios():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Clear existing audios
    await db.audios.delete_many({})
    print("Cleared existing audios")
    
    # Get all modules
    modules = await db.modules.find({}, {'_id': 0}).to_list(500)
    print(f"Found {len(modules)} modules")
    
    # Create audios for each module based on R2 mapping
    audio_count = 0
    for r2_path, module_keyword in R2_TO_MODULE_MAPPING.items():
        # Find matching module
        matching_module = None
        for mod in modules:
            mod_name = mod.get('name', '')
            if module_keyword.lower() in mod_name.lower() or mod_name.lower() in module_keyword.lower():
                matching_module = mod
                break
        
        if matching_module:
            # Determine the full R2 key
            cursus_prefix = ""
            if r2_path.startswith("01-") or r2_path.startswith("02-") or r2_path.startswith("03-") or r2_path.startswith("04-") or r2_path.startswith("05-") or r2_path.startswith("06-") or r2_path.startswith("07-"):
                cursus_prefix = "Audio/cursus-a-falsafa/"
            elif r2_path.startswith("08-") or r2_path.startswith("09-"):
                cursus_prefix = "Audio/cursus-b-theologie-droit/"
            elif r2_path.startswith("10-") or r2_path.startswith("11-") or r2_path.startswith("12-") or r2_path.startswith("13-") or r2_path.startswith("14-"):
                cursus_prefix = "Audio/cursus-c-sciences-islamiques/"
            elif r2_path.startswith("15-") or r2_path.startswith("16-") or r2_path.startswith("17-") or r2_path.startswith("18-"):
                cursus_prefix = "Audio/cursus-d-arts-litterature/"
            elif r2_path.startswith("19-") or r2_path.startswith("20-") or r2_path.startswith("21-") or r2_path.startswith("22-"):
                cursus_prefix = "Audio/cursus-e-spiritualites/"
            
            file_key = f"{cursus_prefix}{r2_path}/episode-01.m4a"
            
            audio_doc = {
                'id': f"audio-{matching_module['id']}",
                'title': f"Épisode 1 — {matching_module['name']}",
                'module_id': matching_module['id'],
                'course_id': matching_module.get('course_id'),
                'episode_number': 1,
                'file_key': file_key,
                'scholar_name': matching_module.get('scholar_name', ''),
                'duration': 0,
                'is_active': True,
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            
            await db.audios.insert_one(audio_doc)
            audio_count += 1
            print(f"  Created audio for: {matching_module['name']}")
        else:
            print(f"  WARNING: No module found for R2 path: {r2_path}")
    
    print(f"\nTotal audios created: {audio_count}")
    
    # Update module episode counts
    for mod in modules:
        count = await db.audios.count_documents({'module_id': mod['id']})
        await db.modules.update_one({'id': mod['id']}, {'$set': {'episode_count_actual': count}})
    
    print("Updated module episode counts")
    client.close()

if __name__ == "__main__":
    asyncio.run(sync_audios())
