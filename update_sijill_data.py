"""
Script to update Le Sijill database with the new cursus structure.
Based on LeSijill_Cursus.docx
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

# New Cursus Structure from the document
CURSUS_DATA = [
    {
        "id": "cursus-falsafa",
        "name": "A. La Falsafa et son héritage",
        "description": "Exploration complète de la philosophie islamique classique : des traductions grecques aux grands penseurs comme Al-Kindī, Al-Fārābī, Avicenne, et Averroès. Inclut le post-avicennisme, la logique arabe et les penseurs inclassables.",
        "icon": "book",
        "order": 1,
        "is_active": True
    },
    {
        "id": "cursus-theologie",
        "name": "B. Théologie et Droit",
        "description": "Le Kalām dans ses trois périodes (pré-mu'tazilite, classique, tardif) et l'histoire de la réflexion juridique (Uṣūl al-fiqh) incluant les quatre écoles juridiques.",
        "icon": "school",
        "order": 2,
        "is_active": True
    },
    {
        "id": "cursus-sciences-islamiques",
        "name": "C. Sciences islamiques et transmission",
        "description": "Doxographie, transmission du Coran et du Hadith, historiographie islamique et autobiographies dans le monde islamique.",
        "icon": "library",
        "order": 3,
        "is_active": True
    },
    {
        "id": "cursus-arts",
        "name": "D. Arts, Littérature et Sciences",
        "description": "Histoire de l'art islamique, poésie (arabe et persane), sciences (biologie, astronomie, mathématiques), géographie islamique, Adab et médecine.",
        "icon": "color-palette",
        "order": 4,
        "is_active": True
    },
    {
        "id": "cursus-spiritualites",
        "name": "E. Philosophies et spiritualités connexes",
        "description": "Kalām chrétien, mystique islamique (Taṣawwuf), ismaélisme et philosophie juive de langue arabe.",
        "icon": "sparkles",
        "order": 5,
        "is_active": True
    }
]

# Courses with their modules
COURSES_DATA = [
    # CURSUS A - La Falsafa
    {
        "id": "cours-traduction",
        "title": "Cours 1 : Le mouvement de traduction (grec → arabe)",
        "cursus_id": "cursus-falsafa",
        "description": "Le mouvement de traduction du grec à l'arabe, fondement de la falsafa.",
        "order": 1,
        "modules": [
            {"name": "Le mouvement de traduction du grec à l'arabe", "scholar_name": "À définir", "episode_count": 2, "notes": "1 court + 1 long"}
        ]
    },
    {
        "id": "cours-falsafa-grands",
        "title": "Cours 2 : Falsafa — Les grands philosophes",
        "cursus_id": "cursus-falsafa",
        "description": "Les grands philosophes de la tradition falsafa : Al-Kindī, Al-Fārābī, Avicenne et ses disciples.",
        "order": 2,
        "modules": [
            {"name": "Al-Kindī (v. 870–950/951)", "scholar_name": "À définir", "episode_count": 3},
            {"name": "Al-Fārābī (m. 950/951)", "scholar_name": "Mohammed Ksiks", "episode_count": 3},
            {"name": "Avicenne (980–1037)", "scholar_name": "Meryem Sebti", "episode_count": 5},
            {"name": "Avicenne dans le monde latin — Les traductions latines au XIIe s.", "scholar_name": "Jules Janssens", "episode_count": 1},
            {"name": "Avicenne dans le monde latin — Traductions médicales", "scholar_name": "Joël Chandelier", "episode_count": 1},
            {"name": "Avicenne dans le monde latin — Traductions à la Renaissance", "scholar_name": "Mali Alinejad-Zanjani", "episode_count": 1},
            {"name": "Bahmanyār Ibn al-Marzubān (m. 1066/1067) — Disciple d'Avicenne", "scholar_name": "Francesco Zamboni", "episode_count": 1},
            {"name": "Al-Lawkarī (m. ca 1123) — Disciple d'Avicenne", "scholar_name": "Francesco Zamboni", "episode_count": 1},
            {"name": "Ibn Ghaylān al-Balkhī (m. ca 1190/1194) — Disciple d'Avicenne", "scholar_name": "Francesco Zamboni", "episode_count": 1},
            {"name": "Al-Masʿūdī (actif XIIe s.) — Disciple d'Avicenne", "scholar_name": "Francesco Zamboni", "episode_count": 1},
        ]
    },
    {
        "id": "cours-post-avicennisme",
        "title": "Cours 3 : Le post-avicennisme",
        "cursus_id": "cursus-falsafa",
        "description": "La réception et la critique d'Avicenne : Al-Ghazālī, Naṣīr al-Dīn al-Ṭūsī, Fakhr al-Dīn al-Rāzī.",
        "order": 3,
        "modules": [
            {"name": "Al-Ghazālī — Kalām", "scholar_name": "Ilyas Harifi", "episode_count": 1},
            {"name": "Al-Ghazālī — Épistémologie", "scholar_name": "Ana Damak", "episode_count": 1},
            {"name": "Al-Ghazālī — Soufisme", "scholar_name": "Al-Walid al-Safaf", "episode_count": 1},
            {"name": "Al-Ghazālī — Uṣūl al-fiqh", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Al-Ghazālī — Attaque des falāsifā", "scholar_name": "Meryem Sebti", "episode_count": 1},
            {"name": "Al-Ghazālī — Critique des Baṭṭiniyya", "scholar_name": "Ilyas Harifi", "episode_count": 1},
            {"name": "Al-Ghazālī — Logique", "scholar_name": "Ilyas Harifi", "episode_count": 1, "notes": "7 épisodes au total"},
            {"name": "La réception de Ghazālī en Occident latin", "scholar_name": "Bucalli / Jules Janssens", "episode_count": 1},
            {"name": "Naṣīr al-Dīn al-Ṭūsī (1201–1274)", "scholar_name": "Maxime Delpierre", "episode_count": 3},
            {"name": "Fakhr al-Dīn al-Rāzī (1149–1209)", "scholar_name": "Amal Awad", "episode_count": 4},
        ]
    },
    {
        "id": "cours-falsafa-occident",
        "title": "Cours 4 : La falsafa en Occident musulman",
        "cursus_id": "cursus-falsafa",
        "description": "Ibn Bājja, Ibn Ṭufayl, Averroès et sa postérité latine.",
        "order": 4,
        "modules": [
            {"name": "Ibn Bājja (v. 1085–1138)", "scholar_name": "Muhammad Abu Hafz", "episode_count": 2},
            {"name": "Ibn Ṭufayl (v. 1105–1185)", "scholar_name": "Ibrahim Bourchachene", "episode_count": 2},
            {"name": "Ibn Rushd / Averroès (1126–1198)", "scholar_name": "Yassir Mechloukh", "episode_count": 3},
            {"name": "La postérité latine d'Averroès", "scholar_name": "À définir", "episode_count": 1},
        ]
    },
    {
        "id": "cours-falsafa-persan",
        "title": "Cours 5 : Le renouveau de la falsafa dans le monde persan",
        "cursus_id": "cursus-falsafa",
        "description": "Suhrawardī, l'école d'Ispahan : Mīr Dāmād, Mīr Fendereskī.",
        "order": 5,
        "modules": [
            {"name": "Suhrawardī (1154–1191)", "scholar_name": "Jari Kaukua", "episode_count": 3},
            {"name": "Shahrazūrī (m. après 1288)", "scholar_name": "Michael Privot", "episode_count": 1},
            {"name": "Ibn Kammunā (1215–1284)", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Mīr Fendereskī (1562–1640)", "scholar_name": "Mathieu Terrier", "episode_count": 1},
            {"name": "Bahāʾ al-Dīn al-ʿĀmilī / Shaykh Bahāʾī (1547–1621)", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Mīr Dāmād (v. 1561–1631)", "scholar_name": "Mathieu Terrier", "episode_count": 3},
        ]
    },
    {
        "id": "cours-logique",
        "title": "Cours 6 : La logique arabe",
        "cursus_id": "cursus-falsafa",
        "description": "Histoire de la logique dans le monde arabo-islamique.",
        "order": 6,
        "modules": [
            {"name": "Histoire de la logique arabe", "scholar_name": "Fouad Mlih", "episode_count": 1},
        ]
    },
    {
        "id": "cours-inclassables",
        "title": "Cours 7 : Les inclassables",
        "cursus_id": "cursus-falsafa",
        "description": "Penseurs hors catégories : Ibn Ḥazm, Ibn Khaldūn, Miskawayh, Al-ʿĀmirī.",
        "order": 7,
        "modules": [
            {"name": "Ibn Ḥazm (994–1064)", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Ibn Khaldūn (1332–1406) — Philosophie", "scholar_name": "Cédric Moleto Machetto", "episode_count": 3},
            {"name": "Abū l-Ḥasan al-ʿĀmirī (v. 912–992)", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Miskawayh (v. 932–1030)", "scholar_name": "Husseyn Ibrahim", "episode_count": 1},
            {"name": "Abū l-Barakāt al-Baghdādī (v. 1080–1164)", "scholar_name": "À définir", "episode_count": 1},
        ]
    },
    # CURSUS B - Théologie et Droit
    {
        "id": "cours-kalam",
        "title": "Cours 8 : Le Kalām — Trois périodes",
        "cursus_id": "cursus-theologie",
        "description": "Histoire de la théologie islamique (Kalām) de ses débuts à l'époque post-classique.",
        "order": 8,
        "modules": [
            {"name": "Kalām — Avant le mu'tazilisme et l'ash'arisme", "scholar_name": "Ilyas Harifi", "episode_count": 1},
            {"name": "Kalām — Phase intermédiaire : mu'tazilisme et ash'arisme", "scholar_name": "Ilyas Harifi", "episode_count": 1},
            {"name": "Kalām — Époque post-classique et kalām tardif", "scholar_name": "Ilyas Harifi", "episode_count": 1},
            {"name": "Ibn Taymiyya (1263–1328)", "scholar_name": "Najjet Zouggar", "episode_count": 1},
        ]
    },
    {
        "id": "cours-fiqh",
        "title": "Cours 9 : Histoire de la réflexion juridique (Uṣūl al-fiqh)",
        "cursus_id": "cursus-theologie",
        "description": "Les quatre écoles juridiques et le droit musulman.",
        "order": 9,
        "modules": [
            {"name": "Histoire des quatre écoles juridiques", "scholar_name": "Ilyas Ahamrar", "episode_count": 1},
            {"name": "Droit musulman", "scholar_name": "Yannis Mahil", "episode_count": 1},
        ]
    },
    # CURSUS C - Sciences islamiques
    {
        "id": "cours-doxographie",
        "title": "Cours 10 : Histoire de la doxographie",
        "cursus_id": "cursus-sciences-islamiques",
        "description": "Ibn al-Nadīm, Ḥājjī Khalīfa, Ṭāshköprīzāde : les grandes encyclopédies.",
        "order": 10,
        "modules": [
            {"name": "Ibn al-Nadīm (v. 932–v. 995)", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Ḥājjī Khalīfa / Kâtip Çelebi (1609–1657)", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Ṭāshköprīzāde (1495–1561)", "scholar_name": "À définir", "episode_count": 1},
        ]
    },
    {
        "id": "cours-coran",
        "title": "Cours 11 : Histoire de la transmission du Coran",
        "cursus_id": "cursus-sciences-islamiques",
        "description": "La transmission et la codification du texte coranique.",
        "order": 11,
        "modules": [
            {"name": "Transmission du Coran", "scholar_name": "À définir", "episode_count": 1, "notes": "À développer"},
        ]
    },
    {
        "id": "cours-hadith",
        "title": "Cours 12 : La transmission du Hadith",
        "cursus_id": "cursus-sciences-islamiques",
        "description": "Le hadith dans le chiisme et le sunnisme.",
        "order": 12,
        "modules": [
            {"name": "Hadith dans le chiisme", "scholar_name": "Robert Gleave", "episode_count": 1},
            {"name": "Hadith dans le sunnisme", "scholar_name": "À définir", "episode_count": 1},
        ]
    },
    {
        "id": "cours-historiographie",
        "title": "Cours 13 : L'historiographie",
        "cursus_id": "cursus-sciences-islamiques",
        "description": "Les grands historiens : Al-Ṭabarī, Ibn Khaldūn, Al-Maqrīzī.",
        "order": 13,
        "modules": [
            {"name": "Ibn Baṭṭūṭa (1304–1368/1369)", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Ibn Khaldūn (1332–1406) — Historiographie", "scholar_name": "Mehdi Ghouirgate", "episode_count": 1},
            {"name": "Al-Maqrīzī (1364–1442)", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Al-Ṭabarī (839–923)", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Ibn Kathīr (1300/1301–1373)", "scholar_name": "À définir", "episode_count": 1},
        ]
    },
    {
        "id": "cours-autobiographies",
        "title": "Cours 14 : Les autobiographies dans le monde islamique",
        "cursus_id": "cursus-sciences-islamiques",
        "description": "L'écriture de soi dans la tradition islamique.",
        "order": 14,
        "modules": [
            {"name": "Autobiographies islamiques", "scholar_name": "À définir", "episode_count": 1, "notes": "À développer"},
        ]
    },
    # CURSUS D - Arts, Littérature et Sciences
    {
        "id": "cours-art",
        "title": "Cours 15 : Histoire de l'art islamique",
        "cursus_id": "cursus-arts",
        "description": "Vue d'ensemble de l'art dans le monde islamique.",
        "order": 15,
        "modules": [
            {"name": "Histoire de l'art islamique", "scholar_name": "Michael Barry", "episode_count": 1, "notes": "À développer"},
        ]
    },
    {
        "id": "cours-poesie",
        "title": "Cours 16 : La poésie",
        "cursus_id": "cursus-arts",
        "description": "La poésie préislamique, arabe et persane.",
        "order": 16,
        "modules": [
            {"name": "Poésie dans le monde préislamique", "scholar_name": "Mohammed Rashid", "episode_count": 1},
            {"name": "Poésie dans le monde arabe", "scholar_name": "Bruno Paoli", "episode_count": 1},
            {"name": "Poésie dans le monde persan", "scholar_name": "Domenico Ingenito", "episode_count": 1},
        ]
    },
    {
        "id": "cours-urjuza",
        "title": "Cours 17 : Histoire de la pédagogie — Les Urjūzā",
        "cursus_id": "cursus-arts",
        "description": "Les vers didactiques dans la tradition islamique.",
        "order": 17,
        "modules": [
            {"name": "Les Urjūzā — pédagogie islamique", "scholar_name": "À définir", "episode_count": 1, "notes": "À développer"},
        ]
    },
    {
        "id": "cours-sciences",
        "title": "Cours 18 : Histoire des sciences",
        "cursus_id": "cursus-arts",
        "description": "Biologie, astronomie, mathématiques dans le monde islamique.",
        "order": 18,
        "modules": [
            {"name": "Biologie islamique", "scholar_name": "Maissa Ibn Saad", "episode_count": 1},
            {"name": "Al-Jāḥiẓ (v. 776–868) — Taxinomie des animaux", "scholar_name": "Mohammad A'rab", "episode_count": 1},
            {"name": "Astronomie islamique", "scholar_name": "Paul Hullman", "episode_count": 1},
            {"name": "Mathématiques islamiques", "scholar_name": "Marwan Ibn Milad", "episode_count": 1},
        ]
    },
    {
        "id": "cours-geographie",
        "title": "Cours 19 : La géographie islamique — Al-Idrīsī et les grands géographes",
        "cursus_id": "cursus-arts",
        "description": "Les grands géographes : Al-Idrīsī, Ibn Baṭṭūṭa, Al-Bīrūnī.",
        "order": 19,
        "modules": [
            {"name": "Al-Yaʿqūbī (m. v. 897) — Géographie et histoire", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Ibn Khordādhbeh (820–912) — Livre des routes et des royaumes", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Al-Masʿūdī (v. 896–956) — Géographie et cartographie", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Al-Istakhrī (m. v. 957) — Atlas de l'Islam", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Ibn Ḥawqal (actif v. 943–977) — Configuration de la Terre", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Al-Muqaddasī (945–v. 1000) — La meilleure répartition des régions", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Al-Bīrūnī (973–1048) — Géographie et cartographie comparée", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Al-Idrīsī (1100–1165/1166) — Nuzhat al-Mushtāq / Livre de Roger", "scholar_name": "À définir", "episode_count": 2, "notes": "Cours central"},
            {"name": "Yāqūt al-Ḥamawī (1179–1229) — Dictionnaire géographique", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Abū al-Fidāʾ (1273–1331) — Taqwīm al-Buldān", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Ibn Baṭṭūṭa (1304–1368/1369) — Rihla / Les Voyages", "scholar_name": "À définir", "episode_count": 1},
        ]
    },
    {
        "id": "cours-adab",
        "title": "Cours 20 : Adab et sciences médicales",
        "cursus_id": "cursus-arts",
        "description": "Culture et belles-lettres, médecine islamique.",
        "order": 20,
        "modules": [
            {"name": "Introduction à l'Adab — Culture et belles-lettres", "scholar_name": "À définir", "episode_count": 1, "notes": "À développer"},
            {"name": "Al-Jāḥiẓ (v. 776–868) — Adab et rhétorique", "scholar_name": "Mohammad A'rab", "episode_count": 1},
            {"name": "Ibn Qutayba (828–889) — Adab et sciences du Hadith", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Al-Tawḥīdī (v. 930–v. 1023) — Philosophie et Adab", "scholar_name": "À définir", "episode_count": 1},
            {"name": "La médecine islamique — Hunayn ibn Isḥāq (809–873)", "scholar_name": "À définir", "episode_count": 1, "notes": "Traducteur Galien"},
            {"name": "Ibn Sīnā (980–1037) — Le Canon de la médecine", "scholar_name": "Meryem Sebti", "episode_count": 1, "notes": "Lien avec falsafa"},
            {"name": "Ibn al-Nafīs (1213–1288) — Circulation pulmonaire", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Médecine et pharmacologie — Ibn al-Bayṭār (1197–1248)", "scholar_name": "À définir", "episode_count": 1},
        ]
    },
    # CURSUS E - Philosophies et spiritualités connexes
    {
        "id": "cours-kalam-chretien",
        "title": "Cours 21 : Le Kalām chrétien et les logiciens de Bagdad",
        "cursus_id": "cursus-spiritualites",
        "description": "Les penseurs chrétiens de langue arabe.",
        "order": 21,
        "modules": [
            {"name": "Yaḥyā ibn ʿAdī (893–974)", "scholar_name": "Olga Lizzini", "episode_count": 2},
            {"name": "Thābit ibn Qurra (826–901)", "scholar_name": "À définir", "episode_count": 1},
        ]
    },
    {
        "id": "cours-soufisme",
        "title": "Cours 22 : La mystique islamique (Taṣawwuf)",
        "cursus_id": "cursus-spiritualites",
        "description": "Le soufisme : des origines à Ibn ʿArabī.",
        "order": 22,
        "modules": [
            {"name": "Le premier taṣawwuf", "scholar_name": "Eric Geoffroy", "episode_count": 1},
            {"name": "Ibn ʿArabī", "scholar_name": "Gregory Vandamme", "episode_count": 1},
            {"name": "Le soufisme iranien", "scholar_name": "Omid Safi / Sajjad Rizvi / Eve Feuillebois", "episode_count": 1, "notes": "À confirmer"},
            {"name": "Nafisi", "scholar_name": "Sima Orsini", "episode_count": 1},
            {"name": "Soufisme et philosophie", "scholar_name": "Gregory Vandamme", "episode_count": 1},
        ]
    },
    {
        "id": "cours-ismaelisme",
        "title": "Cours 23 : L'ismaélisme",
        "cursus_id": "cursus-spiritualites",
        "description": "Histoire et philosophie ismaéliennes.",
        "order": 23,
        "modules": [
            {"name": "Histoire de l'ismaélisme", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Philosophie ismaélienne", "scholar_name": "Daniel De Smet", "episode_count": 1},
        ]
    },
    {
        "id": "cours-philo-juive",
        "title": "Cours 24 : La philosophie juive de langue arabe",
        "cursus_id": "cursus-spiritualites",
        "description": "De Saʿadya Gaon à Maïmonide : la pensée juive en terre d'Islam.",
        "order": 24,
        "modules": [
            {"name": "Dāwūd ibn Marwān al-Muqammaṣ (IXe s.)", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Isaac Israeli (ca 855–955)", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Saʿadya Gaon (882–942)", "scholar_name": "David Lemler", "episode_count": 1},
            {"name": "Solomon Ibn Gabirol (v. 1021–v. 1058)", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Baḥya ibn Paqūda (fl. XIe s.)", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Judah Halevi (v. 1075–1141)", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Natanʾel al-Fayyūmī (fl. XIIe s.)", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Abraham ibn Daud (v. 1110–1180)", "scholar_name": "À définir", "episode_count": 1},
            {"name": "Moïse Maïmonide (1138–1204)", "scholar_name": "Géraldine Roux", "episode_count": 1},
        ]
    },
]

# Images for each cursus
CURSUS_IMAGES = {
    "cursus-falsafa": "https://images.unsplash.com/photo-1720700955633-63e99df2a092",
    "cursus-theologie": "https://images.unsplash.com/photo-1720701575003-51dafcf39cb4",
    "cursus-sciences-islamiques": "https://images.unsplash.com/photo-1720701574998-d68020bce2bd",
    "cursus-arts": "https://images.pexels.com/photos/33015887/pexels-photo-33015887.jpeg?auto=compress&cs=tinysrgb&w=600",
    "cursus-spiritualites": "https://images.unsplash.com/photo-1627681584212-855e8e052c87",
}

async def update_database():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print(f"Connected to database: {DB_NAME}")
    
    # 1. Clear existing cursus and courses
    await db.cursus.delete_many({})
    await db.courses.delete_many({})
    await db.modules.delete_many({})
    print("Cleared old data")
    
    # 2. Insert new cursus
    for cursus in CURSUS_DATA:
        cursus['created_at'] = datetime.now(timezone.utc).isoformat()
        cursus['thumbnail'] = CURSUS_IMAGES.get(cursus['id'], '')
        await db.cursus.insert_one(cursus)
    print(f"Inserted {len(CURSUS_DATA)} cursus")
    
    # 3. Insert courses and modules
    module_count = 0
    for course in COURSES_DATA:
        course_id = course['id']
        modules = course.pop('modules', [])
        
        # Add course metadata
        course['is_active'] = True
        course['created_at'] = datetime.now(timezone.utc).isoformat()
        course['thumbnail'] = CURSUS_IMAGES.get(course['cursus_id'], '')
        
        await db.courses.insert_one(course)
        
        # Insert modules for this course
        for i, mod in enumerate(modules, 1):
            module_doc = {
                'id': f"{course_id}-mod-{i}",
                'name': mod['name'],
                'course_id': course_id,
                'scholar_name': mod.get('scholar_name', ''),
                'episode_count': mod.get('episode_count', 1),
                'order': i,
                'is_active': True,
                'notes': mod.get('notes', ''),
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            await db.modules.insert_one(module_doc)
            module_count += 1
    
    print(f"Inserted {len(COURSES_DATA)} courses")
    print(f"Inserted {module_count} modules")
    
    # Update counts
    for cursus in CURSUS_DATA:
        count = await db.courses.count_documents({'cursus_id': cursus['id']})
        await db.cursus.update_one({'id': cursus['id']}, {'$set': {'course_count': count}})
    
    print("Database update complete!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(update_database())
