#!/usr/bin/env python3
"""
Script to populate the HikmabyLM database with the complete curriculum structure.
7 Cursus, with Courses and Modules based on the v3 document.
"""

import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import uuid

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

print(f"Using database: {DB_NAME}")

# ─── CURSUS 1: La falsafa et son héritage ────────────────────────────────────

CURSUS_1_COURSES = [
    {
        "title": "Cours 1 : Le mouvement de traduction du grec à l'arabe",
        "modules": [
            {"name": "Introduction au mouvement de traduction", "episodes": 2}
        ]
    },
    {
        "title": "Cours 2 : Falsafa",
        "modules": [
            {"name": "Al-Kindī (v. 801–873)", "scholar": None, "episodes": 2},
            {"name": "Al-Fārābī (m. 950)", "scholar": "Mohammed Ksiks", "episodes": 2},
            {"name": "Avicenne (980-1037)", "scholar": "Meryem Sebti", "episodes": 2},
            {"name": "Avicenne dans le monde Latin", "scholar": "Jules Janssens", "episodes": 2},
            {"name": "Les disciples d'Avicenne", "scholar": "Francesco Zamboni", "episodes": 2,
             "description": "Bahmanyār, Al-Lawkarī, Ibn Ghaylān, Al-Masʿūdī"}
        ]
    },
    {
        "title": "Cours 3 : Le post-avicennisme",
        "modules": [
            {"name": "Abū Ḥāmid al-Ghazālī (1058–1111)", "scholar": "Meryem Sebti", "episodes": 2},
            {"name": "La réception de Ghazālī en Occident latin", "scholar": "Jules Janssens", "episodes": 2},
            {"name": "Naṣīr al-Dīn al-Ṭūsī (1201–1274)", "scholar": "Maxime Delpierre", "episodes": 2},
            {"name": "Fakhr al-Dīn al-Rāzī (1149–1209)", "scholar": "Amal Awad", "episodes": 2}
        ]
    },
    {
        "title": "Cours 4 : La falsafa en Occident du monde musulman",
        "modules": [
            {"name": "Ibn Bājja (v. 1085–1138)", "scholar": "Muhammad Abu Hafz", "episodes": 2},
            {"name": "Ibn Ṭufayl (v. 1105–1185)", "scholar": "Ibrahim Bourchachene", "episodes": 2},
            {"name": "Ibn Rushd (1126–1198)", "scholar": "Yassir Mechloukh", "episodes": 2}
        ]
    },
    {
        "title": "Cours 5 : Le renouveau de la falsafa dans le monde persan",
        "modules": [
            {"name": "Suhrawardī (1154–1191)", "scholar": "Jari Kaukua", "episodes": 2},
            {"name": "Shahrazūrī (m. après 1288)", "scholar": "Michael Privot", "episodes": 2},
            {"name": "Ibn Kammunā (1215–1284)", "scholar": None, "episodes": 2},
            {"name": "Mīr Fendereskī (1562–1640)", "scholar": "Mathieu Terrier", "episodes": 2},
            {"name": "Shaykh Bahāʾī (1547–1621)", "scholar": None, "episodes": 2},
            {"name": "Mīr Dāmād (v. 1561–1632)", "scholar": "Mathieu Terrier", "episodes": 2}
        ]
    },
    {
        "title": "Cours 6 : La logique arabe",
        "modules": [
            {"name": "Histoire de la logique arabe", "scholar": "Fouad Mlih", "episodes": 2}
        ]
    },
    {
        "title": "Cours 7 : Les inclassables",
        "modules": [
            {"name": "Ibn Ḥazm (994–1064)", "scholar": None, "episodes": 2},
            {"name": "Ibn Khaldūn (1332–1406)", "scholar": "Cédric Moleto Machetto", "episodes": 2},
            {"name": "Abū-l-Ḥasan al-ʿĀmirī (v. 912–992)", "scholar": None, "episodes": 2},
            {"name": "Miskawayh (v. 932–1030)", "scholar": "Husseyn Ibrahim", "episodes": 2},
            {"name": "Abū l-Barakāt al-Baghdādī (v. 1080–1165)", "scholar": None, "episodes": 2}
        ]
    },
    {
        "title": "Cours 8 : Le kalām (Théologie dogmatique)",
        "modules": [
            {"name": "Avant le mu'tazilisme et l'ash'arisme", "scholar": "Ilyas Harifi", "episodes": 2},
            {"name": "La phase intermédiaire : mu'tazlisme et ash'arisme", "scholar": "Ilyas Harifi", "episodes": 2},
            {"name": "Époque post-classique et kalām tardif", "scholar": "Ilyas Harifi", "episodes": 2},
            {"name": "Ibn Taymiyya (1263–1328)", "scholar": "Najjet Zouggar", "episodes": 2}
        ]
    },
    {
        "title": "Cours 9 : Histoire de la réflexion juridique (uṣūl al-fiqh)",
        "modules": [
            {"name": "Histoire des quatre écoles juridiques", "scholar": "Ilyas Ahamrar", "episodes": 2},
            {"name": "Droit musulman", "scholar": "Yannis Mahil", "episodes": 2}
        ]
    },
    {
        "title": "Cours 10 : Histoire de la doxographie",
        "modules": [
            {"name": "Ibn al-Nadīm (v. 932–995)", "scholar": None, "episodes": 2},
            {"name": "Ḥājjī Khalīfa (1609–1657)", "scholar": None, "episodes": 2},
            {"name": "Ṭāshköprīzāde (1495–1561)", "scholar": None, "episodes": 2}
        ]
    },
    {
        "title": "Cours 11 : Histoire de la transmission du Coran",
        "modules": [
            {"name": "La transmission du Coran", "scholar": None, "episodes": 2}
        ]
    },
    {
        "title": "Cours 12 : La transmission du Hadith",
        "modules": [
            {"name": "Le hadith dans le chiisme", "scholar": "Robert Gleave", "episodes": 2},
            {"name": "Le hadith dans le sunnisme", "scholar": None, "episodes": 2}
        ]
    },
    {
        "title": "Cours 13 : L'historiographie",
        "modules": [
            {"name": "Ibn Baṭṭūṭa (1304–1369)", "scholar": None, "episodes": 2},
            {"name": "Ibn Khaldūn (historiographie)", "scholar": "Mehdi Ghouirgate", "episodes": 2},
            {"name": "Al-Maqrīzī (1364–1442)", "scholar": None, "episodes": 2},
            {"name": "Al-Ṭabarī (839–923)", "scholar": None, "episodes": 2},
            {"name": "Ibn Kathīr (1300–1373)", "scholar": None, "episodes": 2}
        ]
    },
    {
        "title": "Cours 14 : Les autobiographies dans le monde islamique",
        "modules": [
            {"name": "Introduction aux autobiographies", "scholar": None, "episodes": 2}
        ]
    },
    {
        "title": "Cours 15 : Histoire de l'art",
        "modules": [
            {"name": "L'art islamique", "scholar": "Michael Barry", "episodes": 2}
        ]
    },
    {
        "title": "Cours 16 : La poésie",
        "modules": [
            {"name": "La poésie préislamique", "scholar": "Mohammed Rashid", "episodes": 2},
            {"name": "La poésie arabe", "scholar": "Bruno Paoli", "episodes": 2},
            {"name": "La poésie persane", "scholar": "Domenico Ingenito", "episodes": 2}
        ]
    },
    {
        "title": "Cours 17 : Histoire de la pédagogie",
        "modules": [
            {"name": "Les Urjūzā et méthodes pédagogiques", "scholar": None, "episodes": 2}
        ]
    },
    {
        "title": "Cours 18 : Histoire des sciences",
        "modules": [
            {"name": "Biologie", "scholar": "Maissa Ibn Saad", "episodes": 2},
            {"name": "Al-Jāḥiẓ et la taxinomie", "scholar": "Mohammad A'rab", "episodes": 2},
            {"name": "Astronomie", "scholar": "Paul Hullman", "episodes": 2},
            {"name": "Mathématiques", "scholar": "Marwan Ibn Milad", "episodes": 2}
        ]
    },
    {
        "title": "Cours 19 : Le kalām chrétien et les logiciens de Bagdad",
        "modules": [
            {"name": "Yaḥyā ibn ʿAdī (893–974)", "scholar": "Olga Lizzini", "episodes": 2},
            {"name": "Thābit ibn Qurra (826–901)", "scholar": None, "episodes": 2}
        ]
    },
    {
        "title": "Cours 20 : La philosophie juive de langue arabe",
        "modules": [
            {"name": "Dāwūd ibn Marwān al-Muqammaṣ", "scholar": None, "episodes": 2},
            {"name": "Isaac Israeli (ca 855–955)", "scholar": None, "episodes": 2},
            {"name": "Saʿadya Gaon (882–942)", "scholar": "David Lemler", "episodes": 2},
            {"name": "Solomon Ibn Gabirol (Avicebron)", "scholar": None, "episodes": 2},
            {"name": "Baḥya ibn Paqūda", "scholar": None, "episodes": 2},
            {"name": "Judah Halevi (v. 1075–1141)", "scholar": None, "episodes": 2},
            {"name": "Natanʾel al-Fayyūmī", "scholar": None, "episodes": 2},
            {"name": "Abraham ibn Daud (v. 1110–1180)", "scholar": None, "episodes": 2},
            {"name": "Moïse Maïmonide (1138–1204)", "scholar": "Géraldine Roux", "episodes": 2}
        ]
    }
]

# ─── CURSUS 2-7: Simplified courses ──────────────────────────────────────────

ALL_CURSUS = [
    {
        "id": "cursus-falsafa",
        "name": "Cursus 1 — La falsafa et son héritage",
        "description": "Exploration complète de la philosophie islamique classique : des traductions grecques aux grands penseurs.",
        "icon": "book-open",
        "order": 1,
        "courses": CURSUS_1_COURSES
    },
    {
        "id": "cursus-soufisme",
        "name": "Cursus 2 — Spiritualité et Soufisme",
        "description": "Le soufisme, ses origines, ses grands maîtres et son rapport à la philosophie.",
        "icon": "heart",
        "order": 2,
        "courses": [
            {"title": "Le premier taṣawwuf", "modules": [{"name": "Origines du soufisme", "scholar": "Eric Geoffroy", "episodes": 2}]},
            {"title": "Ibn ʿArabī", "modules": [{"name": "Ibn ʿArabī (1165-1240)", "scholar": "Gregory Vandamme", "episodes": 2}]},
            {"title": "Le soufisme iranien", "modules": [{"name": "La tradition soufie persane", "scholar": None, "episodes": 2}]},
            {"title": "Nafisi", "modules": [{"name": "Le soufisme littéraire", "scholar": "Sima Orsini", "episodes": 2}]},
            {"title": "Soufisme et philosophie", "modules": [{"name": "Les rapports mystique-philosophie", "scholar": "Gregory Vandamme", "episodes": 2}]}
        ]
    },
    {
        "id": "cursus-coran",
        "name": "Cursus 3 — Sciences du Coran",
        "description": "Introduction aux sciences coraniques, exégèse et herméneutique.",
        "icon": "quran",
        "order": 3,
        "courses": [
            {"title": "Introduction aux sciences coraniques", "modules": [{"name": "Fondements des sciences coraniques", "scholar": None, "episodes": 2}]},
            {"title": "Histoire de la révélation et de la compilation", "modules": [{"name": "Révélation et compilation", "scholar": None, "episodes": 2}]},
            {"title": "Exégèse (Tafsir) — méthodes et écoles", "modules": [{"name": "Méthodes d'exégèse", "scholar": None, "episodes": 2}]},
            {"title": "Herméneutique coranique contemporaine", "modules": [{"name": "Approches contemporaines", "scholar": None, "episodes": 2}]},
            {"title": "Coran et littérature — poétique du texte sacré", "modules": [{"name": "Poétique coranique", "scholar": None, "episodes": 2}]}
        ]
    },
    {
        "id": "cursus-kalam",
        "name": "Cursus 4 — Théologie Islamique (Kalam)",
        "description": "Les grandes écoles théologiques et les débats fondamentaux de la pensée islamique.",
        "icon": "mosque",
        "order": 4,
        "courses": [
            {"title": "Introduction au Kalam", "modules": [{"name": "Fondements du Kalam", "scholar": None, "episodes": 2}]},
            {"title": "Les grandes écoles théologiques", "modules": [{"name": "Mutazilites, Asharites, Maturidites", "scholar": None, "episodes": 2}]},
            {"title": "Foi, libre arbitre et prédestination", "modules": [{"name": "Questions théologiques", "scholar": None, "episodes": 2}]},
            {"title": "Théologie et dialogue interreligieux", "modules": [{"name": "Dialogue interreligieux", "scholar": None, "episodes": 2}]},
            {"title": "Islam et modernité", "modules": [{"name": "Enjeux contemporains", "scholar": None, "episodes": 2}]}
        ]
    },
    {
        "id": "cursus-fiqh",
        "name": "Cursus 5 — Droit Islamique (Fiqh & Usul)",
        "description": "Les fondements du droit musulman et les quatre écoles juridiques.",
        "icon": "scale-balanced",
        "order": 5,
        "courses": [
            {"title": "Introduction au Fiqh", "modules": [{"name": "Fondements du Fiqh", "scholar": None, "episodes": 2}]},
            {"title": "Les quatre écoles juridiques", "modules": [{"name": "Hanafi, Maliki, Shafii, Hanbali", "scholar": None, "episodes": 2}]},
            {"title": "Usul al-Fiqh", "modules": [{"name": "Les fondements du droit", "scholar": None, "episodes": 2}]},
            {"title": "Droit islamique et droit occidental", "modules": [{"name": "Comparaisons juridiques", "scholar": None, "episodes": 2}]},
            {"title": "Bioéthique et questions contemporaines", "modules": [{"name": "Questions éthiques modernes", "scholar": None, "episodes": 2}]}
        ]
    },
    {
        "id": "cursus-histoire",
        "name": "Cursus 6 — Histoire de l'Islam",
        "description": "Des origines à nos jours : l'histoire de la civilisation islamique.",
        "icon": "clock-rotate-left",
        "order": 6,
        "courses": [
            {"title": "Des origines à l'hégire", "modules": [{"name": "Les débuts de l'Islam", "scholar": None, "episodes": 2}]},
            {"title": "L'âge d'or de la civilisation islamique", "modules": [{"name": "L'apogée de la civilisation", "scholar": None, "episodes": 2}]},
            {"title": "Islam en Al-Andalus", "modules": [{"name": "L'héritage hispano-arabe", "scholar": None, "episodes": 2}]},
            {"title": "L'empire ottoman et les grandes dynasties", "modules": [{"name": "Les empires islamiques", "scholar": None, "episodes": 2}]},
            {"title": "Islam en France et en Europe", "modules": [{"name": "Histoire et présent", "scholar": None, "episodes": 2}]}
        ]
    },
    {
        "id": "cursus-arts",
        "name": "Cursus 7 — Civilisation et Arts Islamiques",
        "description": "Architecture, calligraphie, musique et esthétique dans la tradition islamique.",
        "icon": "palette",
        "order": 7,
        "courses": [
            {"title": "Architecture islamique", "modules": [{"name": "Mosquées, palais, jardins", "scholar": None, "episodes": 2}]},
            {"title": "Calligraphie et arts du livre", "modules": [{"name": "L'art de l'écriture", "scholar": None, "episodes": 2}]},
            {"title": "Musique et poésie", "modules": [{"name": "Traditions musicales", "scholar": None, "episodes": 2}]},
            {"title": "Sciences et mathématiques", "modules": [{"name": "Contributions scientifiques", "scholar": None, "episodes": 2}]},
            {"title": "Mode, design et esthétique contemporaine", "modules": [{"name": "Esthétique islamique moderne", "scholar": None, "episodes": 2}]}
        ]
    }
]


async def populate_database():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("=== NETTOYAGE ===")
    # Clean old collections
    await db.thematiques.delete_many({})
    await db.courses.delete_many({})
    await db.modules.delete_many({})
    # Create new cursus collection
    await db.cursus.delete_many({})
    print("Collections nettoyées")
    
    total_courses = 0
    total_modules = 0
    
    for cursus_data in ALL_CURSUS:
        print(f"\n=== {cursus_data['name']} ===")
        
        # Create cursus
        cursus_doc = {
            'id': cursus_data['id'],
            'name': cursus_data['name'],
            'description': cursus_data['description'],
            'icon': cursus_data['icon'],
            'order': cursus_data['order'],
            'is_active': False,  # Inactive by default
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.cursus.insert_one(cursus_doc)
        
        # Create courses for this cursus
        for course_order, course_data in enumerate(cursus_data['courses'], 1):
            course_id = f"crs_{uuid.uuid4().hex[:8]}"
            course_doc = {
                'id': course_id,
                'title': course_data['title'],
                'description': '',
                'cursus_id': cursus_data['id'],
                'order': course_order,
                'is_active': False,
                'is_featured': False,
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            await db.courses.insert_one(course_doc)
            total_courses += 1
            print(f"  {course_data['title']}")
            
            # Create modules for this course
            for mod_order, mod_data in enumerate(course_data.get('modules', []), 1):
                module_id = f"mod_{uuid.uuid4().hex[:8]}"
                module_doc = {
                    'id': module_id,
                    'name': mod_data['name'],
                    'description': mod_data.get('description', ''),
                    'course_id': course_id,
                    'scholar_name': mod_data.get('scholar'),
                    'order': mod_order,
                    'episode_count': mod_data.get('episodes', 2),
                    'is_active': False,
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
                await db.modules.insert_one(module_doc)
                total_modules += 1
                print(f"    - {mod_data['name']}" + (f" ({mod_data.get('scholar')})" if mod_data.get('scholar') else ""))
    
    print(f"\n{'='*50}")
    print(f"✅ TERMINÉ!")
    print(f"   - {len(ALL_CURSUS)} cursus")
    print(f"   - {total_courses} cours")
    print(f"   - {total_modules} modules")
    print(f"   - Tous inactifs par défaut (prêts pour publication)")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(populate_database())
