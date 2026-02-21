#!/usr/bin/env python3
"""
Script to update the HikmabyLM database with the new course list.
This will update thematiques (cursus) and courses based on the provided document.
"""

import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import uuid

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'hikma')

# New data structure from the document
THEMATIQUES = [
    {
        "id": "th-falsafa-heritage",
        "title": "A. La falsafa et son héritage",
        "description": "Exploration de la philosophie islamique classique, des traductions grecques aux grands penseurs comme Al-Kindī, Al-Fārābī et Avicenne.",
        "icon": "book-open",
        "order": 1
    },
    {
        "id": "th-post-avicennisme",
        "title": "B. Le post-avicennisme",
        "description": "L'évolution de la pensée philosophique après Avicenne, incluant Ghazālī, Naṣīr al-Dīn al-Ṭūsī et Fakhr al-Dīn al-Rāzī.",
        "icon": "graduation-cap",
        "order": 2
    },
    {
        "id": "th-falsafa-occident",
        "title": "C. La falsafa en Occident du monde musulman",
        "description": "Les philosophes de l'Andalousie et du Maghreb : Ibn Bājja, Ibn Ṭufayl et Ibn Rushd (Averroès).",
        "icon": "globe",
        "order": 3
    },
    {
        "id": "th-renouveau-persan",
        "title": "D. Le renouveau de la falsafa dans le monde persan",
        "description": "La renaissance philosophique en Perse avec Suhrawardī, l'École d'Ispahan et les grands penseurs safavides.",
        "icon": "star",
        "order": 4
    },
    {
        "id": "th-logique-arabe",
        "title": "E. La logique arabe",
        "description": "Histoire et développement de la logique dans la pensée arabo-islamique.",
        "icon": "brain",
        "order": 5
    },
    {
        "id": "th-inclassables",
        "title": "F. Les inclassables",
        "description": "Penseurs singuliers ne s'inscrivant pas dans les catégories traditionnelles : Ibn Ḥazm, Ibn Khaldūn, Miskawayh...",
        "icon": "lightbulb",
        "order": 6
    },
    {
        "id": "th-kalam",
        "title": "G. Le kalām (Théologie dogmatique)",
        "description": "Histoire de la théologie dogmatique islamique : mu'tazilisme, ash'arisme, et développements ultérieurs.",
        "icon": "mosque",
        "order": 7
    },
    {
        "id": "th-usul-fiqh",
        "title": "H. Histoire de la réflexion juridique",
        "description": "Les fondements du droit musulman (uṣūl al-fiqh) et l'histoire des quatre écoles juridiques.",
        "icon": "scale-balanced",
        "order": 8
    },
    {
        "id": "th-doxographie",
        "title": "I. Histoire de la doxographie",
        "description": "Les grands bibliographes et encyclopédistes du monde islamique.",
        "icon": "book",
        "order": 9
    },
    {
        "id": "th-transmission-coran",
        "title": "J. Histoire de la transmission du Coran",
        "description": "Étude de la transmission et de la préservation du texte coranique.",
        "icon": "quran",
        "order": 10
    },
    {
        "id": "th-transmission-hadith",
        "title": "K. La transmission du Hadith",
        "description": "Histoire de la science du hadith dans les traditions sunnite et chiite.",
        "icon": "scroll",
        "order": 11
    },
    {
        "id": "th-historiographie",
        "title": "L. L'historiographie",
        "description": "Les grands historiens du monde islamique : Ibn Baṭṭūṭa, Ibn Khaldūn, Al-Ṭabarī...",
        "icon": "clock-rotate-left",
        "order": 12
    },
    {
        "id": "th-autobiographies",
        "title": "M. Les autobiographies dans le monde islamique",
        "description": "Tradition autobiographique dans la civilisation islamique.",
        "icon": "user-pen",
        "order": 13
    },
    {
        "id": "th-histoire-art",
        "title": "N. Histoire de l'art",
        "description": "L'art dans le monde islamique à travers les siècles.",
        "icon": "palette",
        "order": 14
    },
    {
        "id": "th-poesie",
        "title": "O. La poésie",
        "description": "La poésie dans les mondes préislamique, arabe et persan.",
        "icon": "feather",
        "order": 15
    },
    {
        "id": "th-pedagogie",
        "title": "P. Histoire de la pédagogie",
        "description": "Méthodes et traditions pédagogiques dans le monde islamique.",
        "icon": "chalkboard-teacher",
        "order": 16
    },
    {
        "id": "th-sciences",
        "title": "Q. Histoire des sciences",
        "description": "Biologie, astronomie, mathématiques dans la civilisation islamique.",
        "icon": "flask",
        "order": 17
    },
    {
        "id": "th-kalam-chretien",
        "title": "R. Le kalām chrétien et les logiciens de Bagdad",
        "description": "Les penseurs chrétiens de langue arabe et l'École de Bagdad.",
        "icon": "church",
        "order": 18
    },
    {
        "id": "th-mystique",
        "title": "S. La Mystique islamique",
        "description": "Le soufisme : ses origines, ses grands maîtres et son rapport à la philosophie.",
        "icon": "heart",
        "order": 19
    },
    {
        "id": "th-ismaelisme",
        "title": "T. Ismaélisme",
        "description": "Histoire et philosophie de la tradition ismaélienne.",
        "icon": "moon",
        "order": 20
    },
    {
        "id": "th-philosophie-juive",
        "title": "U. La philosophie juive de langue arabe",
        "description": "Les philosophes juifs écrivant en arabe : Saʿadya Gaon, Maïmonide...",
        "icon": "star-of-david",
        "order": 21
    }
]

# Courses organized by thematique
COURSES = [
    # A. La falsafa et son héritage
    {
        "id": "crs-traduction-grec-arabe",
        "title": "Le mouvement de traduction du grec à l'arabe",
        "thematique_id": "th-falsafa-heritage",
        "scholar_name": None,
        "description": "L'histoire du vaste mouvement de traduction des textes grecs vers l'arabe aux VIIIe-Xe siècles.",
        "episodes": 1
    },
    {
        "id": "crs-al-kindi",
        "title": "Al-Kindī",
        "thematique_id": "th-falsafa-heritage",
        "scholar_name": None,
        "description": "Le premier grand philosophe de langue arabe (v. 801–873), surnommé 'le philosophe des Arabes'.",
        "episodes": 3
    },
    {
        "id": "crs-al-farabi",
        "title": "Al-Fārābī",
        "thematique_id": "th-falsafa-heritage",
        "scholar_name": "Mohammed Ksiks",
        "description": "Le 'Second Maître' après Aristote (m. 950), fondateur de la philosophie politique islamique.",
        "episodes": 3
    },
    {
        "id": "crs-avicenne",
        "title": "Avicenne",
        "thematique_id": "th-falsafa-heritage",
        "scholar_name": "Meryem Sebti",
        "description": "Ibn Sīnā (980-1037), le prince des médecins et figure majeure de la métaphysique islamique.",
        "episodes": 5
    },
    {
        "id": "crs-avicenne-latin",
        "title": "Avicenne dans le monde Latin",
        "thematique_id": "th-falsafa-heritage",
        "scholar_name": "Jules Janssens",
        "description": "La réception et l'influence d'Avicenne dans la scolastique médiévale européenne.",
        "episodes": 3
    },
    {
        "id": "crs-disciples-avicenne",
        "title": "Les disciples d'Avicenne",
        "thematique_id": "th-falsafa-heritage",
        "scholar_name": "Francesco Zamboni",
        "description": "Bahmanyār, Al-Lawkarī, Ibn Ghaylān et les continuateurs de la tradition avicennienne.",
        "episodes": 4
    },
    
    # B. Le post-avicennisme
    {
        "id": "crs-ghazali",
        "title": "Abū Ḥāmid al-Ghazālī",
        "thematique_id": "th-post-avicennisme",
        "scholar_name": "Meryem Sebti",
        "description": "Le réformateur de l'islam (1058-1111) : théologien, philosophe, juriste et mystique.",
        "episodes": 7
    },
    {
        "id": "crs-ghazali-occident",
        "title": "La réception de Ghazālī en Occident latin",
        "thematique_id": "th-post-avicennisme",
        "scholar_name": "Jules Janssens",
        "description": "Comment l'œuvre de Ghazālī fut reçue et interprétée dans l'Europe médiévale.",
        "episodes": 1
    },
    {
        "id": "crs-tusi",
        "title": "Naṣīr al-Dīn al-Ṭūsī",
        "thematique_id": "th-post-avicennisme",
        "scholar_name": "Maxime Delpierre",
        "description": "Le grand polymathe persan (1201-1274) : philosophe, astronome et éthicien.",
        "episodes": 3
    },
    {
        "id": "crs-razi",
        "title": "Fakhr al-Dīn al-Rāzī",
        "thematique_id": "th-post-avicennisme",
        "scholar_name": "Amal Awad",
        "description": "Le grand théologien et exégète (1149-1209), figure majeure du kalām tardif.",
        "episodes": 4
    },
    
    # C. La falsafa en Occident du monde musulman
    {
        "id": "crs-ibn-bajja",
        "title": "Ibn Bājja",
        "thematique_id": "th-falsafa-occident",
        "scholar_name": "Muhammad Abu Hafz",
        "description": "Avempace (v. 1085-1138), premier grand philosophe de l'Andalousie.",
        "episodes": 2
    },
    {
        "id": "crs-ibn-tufayl",
        "title": "Ibn Ṭufayl",
        "thematique_id": "th-falsafa-occident",
        "scholar_name": "Ibrahim Bourchachene",
        "description": "L'auteur de Ḥayy ibn Yaqẓān (v. 1105-1185), le roman philosophique par excellence.",
        "episodes": 2
    },
    {
        "id": "crs-ibn-rushd",
        "title": "Ibn Rushd (Averroès)",
        "thematique_id": "th-falsafa-occident",
        "scholar_name": "Yassir Mechloukh",
        "description": "Le Commentateur par excellence d'Aristote (1126-1198), figure centrale de la philosophie médiévale.",
        "episodes": 4
    },
    
    # D. Le renouveau de la falsafa dans le monde persan
    {
        "id": "crs-suhrawardi",
        "title": "Suhrawardī",
        "thematique_id": "th-renouveau-persan",
        "scholar_name": "Jari Kaukua",
        "description": "Le Maître de l'Illumination (1154-1191), fondateur de la philosophie ishrāqī.",
        "episodes": 3
    },
    {
        "id": "crs-shahrazuri",
        "title": "Shahrazūrī",
        "thematique_id": "th-renouveau-persan",
        "scholar_name": "Michael Privot",
        "description": "Continuateur de la philosophie illuminative (m. après 1288).",
        "episodes": 1
    },
    {
        "id": "crs-ibn-kammuna",
        "title": "Ibn Kammunā",
        "thematique_id": "th-renouveau-persan",
        "scholar_name": None,
        "description": "Philosophe juif de langue arabe (1215-1284), commentateur d'Avicenne et Suhrawardī.",
        "episodes": 1
    },
    {
        "id": "crs-mir-fendereski",
        "title": "Mīr Fendereskī",
        "thematique_id": "th-renouveau-persan",
        "scholar_name": "Mathieu Terrier",
        "description": "Philosophe de l'École d'Ispahan (1562-1640), maître de Mullā Ṣadrā.",
        "episodes": 1
    },
    {
        "id": "crs-shaykh-bahai",
        "title": "Bahāʾ al-Dīn al-ʿĀmilī (Shaykh Bahāʾī)",
        "thematique_id": "th-renouveau-persan",
        "scholar_name": None,
        "description": "Polymathe de l'époque safavide (1547-1622), théologien, poète et astronome.",
        "episodes": 1
    },
    {
        "id": "crs-mir-damad",
        "title": "Mīr Dāmād",
        "thematique_id": "th-renouveau-persan",
        "scholar_name": "Mathieu Terrier",
        "description": "Fondateur de l'École d'Ispahan (v. 1561-1632), maître de Mullā Ṣadrā.",
        "episodes": 3
    },
    
    # E. La logique arabe
    {
        "id": "crs-logique-arabe",
        "title": "La logique arabe : son histoire",
        "thematique_id": "th-logique-arabe",
        "scholar_name": "Fouad Mlih",
        "description": "L'histoire de la logique dans la pensée arabo-islamique, de la réception d'Aristote aux développements originaux.",
        "episodes": 3
    },
    
    # F. Les inclassables
    {
        "id": "crs-ibn-hazm",
        "title": "Ibn Ḥazm",
        "thematique_id": "th-inclassables",
        "scholar_name": None,
        "description": "Le grand penseur andalou (994-1064), théologien zāhirite et auteur du Collier de la colombe.",
        "episodes": 1
    },
    {
        "id": "crs-ibn-khaldun-philo",
        "title": "Ibn Khaldūn (Philosophie)",
        "thematique_id": "th-inclassables",
        "scholar_name": "Cédric Moleto Machetto",
        "description": "Le fondateur de la sociologie (1332-1406), auteur de la Muqaddima.",
        "episodes": 3
    },
    {
        "id": "crs-al-amiri",
        "title": "Abū l-Ḥasan al-ʿĀmirī",
        "thematique_id": "th-inclassables",
        "scholar_name": None,
        "description": "Philosophe du Xe siècle (v. 912-992), défenseur de la supériorité de l'Islam.",
        "episodes": 1
    },
    {
        "id": "crs-miskawayh",
        "title": "Miskawayh (Ibn Miskawayh)",
        "thematique_id": "th-inclassables",
        "scholar_name": "Husseyn Ibrahim",
        "description": "Le grand éthicien (v. 932-1030), auteur du Tahdhīb al-akhlāq.",
        "episodes": 1
    },
    {
        "id": "crs-baghdadi",
        "title": "Abū l-Barakāt al-Baghdādī",
        "thematique_id": "th-inclassables",
        "scholar_name": None,
        "description": "Philosophe critique d'Avicenne (v. 1080-1165), auteur du Kitāb al-Muʿtabar.",
        "episodes": 1
    },
    
    # G. Le kalām
    {
        "id": "crs-kalam-histoire",
        "title": "Histoire du kalām",
        "thematique_id": "th-kalam",
        "scholar_name": "Ilyas Harifi",
        "description": "Les trois périodes de la théologie dogmatique : avant le mu'tazilisme, phase classique, et kalām tardif.",
        "episodes": 3
    },
    {
        "id": "crs-ibn-taymiyya",
        "title": "Ibn Taymiyya",
        "thematique_id": "th-kalam",
        "scholar_name": "Najjet Zouggar",
        "description": "Le réformateur hanbalite (1263-1328), figure controversée mais influente.",
        "episodes": 1
    },
    
    # H. Histoire de la réflexion juridique
    {
        "id": "crs-usul-fiqh",
        "title": "Histoire des quatre écoles juridiques",
        "thematique_id": "th-usul-fiqh",
        "scholar_name": "Ilyas Ahamrar",
        "description": "Formation et développement des écoles hanafite, malikite, shafi'ite et hanbalite.",
        "episodes": 4
    },
    {
        "id": "crs-droit-musulman",
        "title": "Le droit musulman",
        "thematique_id": "th-usul-fiqh",
        "scholar_name": "Yannis Mahil",
        "description": "Principes et méthodologie du fiqh islamique.",
        "episodes": 3
    },
    
    # I. Histoire de la doxographie
    {
        "id": "crs-ibn-nadim",
        "title": "Ibn al-Nadīm",
        "thematique_id": "th-doxographie",
        "scholar_name": None,
        "description": "L'auteur du Fihrist (v. 932-995), première grande bibliographie du monde islamique.",
        "episodes": 1
    },
    {
        "id": "crs-hajji-khalifa",
        "title": "Ḥājjī Khalīfa (Kâtip Çelebi)",
        "thematique_id": "th-doxographie",
        "scholar_name": None,
        "description": "Le grand encyclopédiste ottoman (1609-1657).",
        "episodes": 1
    },
    {
        "id": "crs-tashkoprizade",
        "title": "Ṭāshköprīzāde",
        "thematique_id": "th-doxographie",
        "scholar_name": None,
        "description": "Bibliographe et historien ottoman (1495-1561).",
        "episodes": 1
    },
    
    # K. La transmission du Hadith
    {
        "id": "crs-hadith-chiite",
        "title": "Le hadith dans le chiisme",
        "thematique_id": "th-transmission-hadith",
        "scholar_name": "Robert Gleave",
        "description": "La science du hadith dans la tradition chiite.",
        "episodes": 2
    },
    {
        "id": "crs-hadith-sunnite",
        "title": "Le hadith dans le sunnisme",
        "thematique_id": "th-transmission-hadith",
        "scholar_name": None,
        "description": "La science du hadith dans la tradition sunnite.",
        "episodes": 2
    },
    
    # L. L'historiographie
    {
        "id": "crs-ibn-battuta",
        "title": "Ibn Baṭṭūṭa",
        "thematique_id": "th-historiographie",
        "scholar_name": None,
        "description": "Le plus grand voyageur médiéval (1304-1369).",
        "episodes": 1
    },
    {
        "id": "crs-ibn-khaldun-hist",
        "title": "Ibn Khaldūn (Historiographie)",
        "thematique_id": "th-historiographie",
        "scholar_name": "Mehdi Ghouirgate",
        "description": "L'historien et sa méthode révolutionnaire.",
        "episodes": 1
    },
    {
        "id": "crs-maqrizi",
        "title": "Al-Maqrīzī",
        "thematique_id": "th-historiographie",
        "scholar_name": None,
        "description": "Historien de l'Égypte médiévale (1364-1442).",
        "episodes": 1
    },
    {
        "id": "crs-tabari",
        "title": "Al-Ṭabarī",
        "thematique_id": "th-historiographie",
        "scholar_name": None,
        "description": "Le père de l'historiographie islamique (839-923).",
        "episodes": 1
    },
    {
        "id": "crs-ibn-kathir",
        "title": "Ibn Kathīr",
        "thematique_id": "th-historiographie",
        "scholar_name": None,
        "description": "Historien et exégète damascène (1300-1373).",
        "episodes": 1
    },
    
    # N. Histoire de l'art
    {
        "id": "crs-art-islamique",
        "title": "Histoire de l'art islamique",
        "thematique_id": "th-histoire-art",
        "scholar_name": "Michael Barry",
        "description": "L'art dans le monde islamique à travers les siècles.",
        "episodes": 4
    },
    
    # O. La poésie
    {
        "id": "crs-poesie-preislamique",
        "title": "La poésie préislamique",
        "thematique_id": "th-poesie",
        "scholar_name": "Mohammed Rashid",
        "description": "La poésie arabe avant l'Islam.",
        "episodes": 2
    },
    {
        "id": "crs-poesie-arabe",
        "title": "La poésie arabe",
        "thematique_id": "th-poesie",
        "scholar_name": "Bruno Paoli",
        "description": "La grande tradition poétique arabe.",
        "episodes": 3
    },
    {
        "id": "crs-poesie-persane",
        "title": "La poésie persane",
        "thematique_id": "th-poesie",
        "scholar_name": "Domenico Ingenito",
        "description": "La tradition poétique persane classique.",
        "episodes": 3
    },
    
    # Q. Histoire des sciences
    {
        "id": "crs-biologie-islamique",
        "title": "Biologie",
        "thematique_id": "th-sciences",
        "scholar_name": "Maissa Ibn Saad",
        "description": "L'histoire de la biologie dans le monde islamique.",
        "episodes": 2
    },
    {
        "id": "crs-jahiz",
        "title": "Al-Jāḥiẓ",
        "thematique_id": "th-sciences",
        "scholar_name": "Mohammad A'rab",
        "description": "La taxinomie des animaux chez le grand polygraphe (v. 776-869).",
        "episodes": 1
    },
    {
        "id": "crs-astronomie",
        "title": "Astronomie",
        "thematique_id": "th-sciences",
        "scholar_name": "Paul Hullman",
        "description": "L'astronomie dans le monde islamique.",
        "episodes": 3
    },
    {
        "id": "crs-mathematiques",
        "title": "Mathématiques",
        "thematique_id": "th-sciences",
        "scholar_name": "Marwan Ibn Milad",
        "description": "L'histoire des mathématiques arabes.",
        "episodes": 3
    },
    
    # R. Le kalām chrétien et les logiciens de Bagdad
    {
        "id": "crs-yahya-ibn-adi",
        "title": "Yaḥyā ibn ʿAdī",
        "thematique_id": "th-kalam-chretien",
        "scholar_name": "Olga Lizzini",
        "description": "Le grand philosophe chrétien de Bagdad (893-974).",
        "episodes": 2
    },
    {
        "id": "crs-thabit-ibn-qurra",
        "title": "Thābit ibn Qurra",
        "thematique_id": "th-kalam-chretien",
        "scholar_name": None,
        "description": "Le savant sabéen de Bagdad (826-901).",
        "episodes": 1
    },
    
    # S. La Mystique islamique
    {
        "id": "crs-premier-tasawwuf",
        "title": "Le premier taṣawwuf",
        "thematique_id": "th-mystique",
        "scholar_name": "Eric Geoffroy",
        "description": "Les origines du soufisme.",
        "episodes": 3
    },
    {
        "id": "crs-ibn-arabi",
        "title": "Ibn ʿArabī",
        "thematique_id": "th-mystique",
        "scholar_name": "Gregory Vandamme",
        "description": "Le plus grand maître du soufisme (1165-1240).",
        "episodes": 4
    },
    {
        "id": "crs-soufisme-iranien",
        "title": "Le soufisme iranien",
        "thematique_id": "th-mystique",
        "scholar_name": None,
        "description": "La tradition soufie dans le monde persan.",
        "episodes": 3
    },
    {
        "id": "crs-nafisi",
        "title": "Nafisi",
        "thematique_id": "th-mystique",
        "scholar_name": "Sima Orsini",
        "description": "Le soufisme persan et sa littérature.",
        "episodes": 1
    },
    {
        "id": "crs-soufisme-philosophie",
        "title": "Soufisme et philosophie",
        "thematique_id": "th-mystique",
        "scholar_name": "Gregory Vandamme",
        "description": "Les rapports entre mystique et philosophie dans l'Islam.",
        "episodes": 2
    },
    
    # T. Ismaélisme
    {
        "id": "crs-ismaelisme",
        "title": "Ismaélisme : histoire et philosophie",
        "thematique_id": "th-ismaelisme",
        "scholar_name": "Daniel De Smet",
        "description": "Histoire et pensée philosophique de la tradition ismaélienne.",
        "episodes": 4
    },
    
    # U. La philosophie juive de langue arabe
    {
        "id": "crs-muqammas",
        "title": "Dāwūd ibn Marwān al-Muqammaṣ",
        "thematique_id": "th-philosophie-juive",
        "scholar_name": None,
        "description": "Pionnier de la philosophie juive de langue arabe (IXe siècle).",
        "episodes": 1
    },
    {
        "id": "crs-isaac-israeli",
        "title": "Isaac Israeli",
        "thematique_id": "th-philosophie-juive",
        "scholar_name": None,
        "description": "Philosophe et médecin juif (ca 855-955).",
        "episodes": 1
    },
    {
        "id": "crs-saadya-gaon",
        "title": "Saʿadya Gaon",
        "thematique_id": "th-philosophie-juive",
        "scholar_name": "David Lemler",
        "description": "Le père de la philosophie juive médiévale (882-942).",
        "episodes": 2
    },
    {
        "id": "crs-ibn-gabirol",
        "title": "Solomon Ibn Gabirol (Avicebron)",
        "thematique_id": "th-philosophie-juive",
        "scholar_name": None,
        "description": "Poète et philosophe andalou (v. 1021-1058).",
        "episodes": 1
    },
    {
        "id": "crs-bahya-paquda",
        "title": "Baḥya ibn Paqūda",
        "thematique_id": "th-philosophie-juive",
        "scholar_name": None,
        "description": "L'auteur des Devoirs des cœurs (XIe siècle).",
        "episodes": 1
    },
    {
        "id": "crs-judah-halevi",
        "title": "Judah Halevi",
        "thematique_id": "th-philosophie-juive",
        "scholar_name": None,
        "description": "Poète et philosophe, auteur du Kuzari (v. 1075-1141).",
        "episodes": 2
    },
    {
        "id": "crs-abraham-ibn-daud",
        "title": "Abraham ibn Daud",
        "thematique_id": "th-philosophie-juive",
        "scholar_name": None,
        "description": "Philosophe aristotélicien (v. 1110-1180).",
        "episodes": 1
    },
    {
        "id": "crs-maimonide",
        "title": "Moïse Maïmonide",
        "thematique_id": "th-philosophie-juive",
        "scholar_name": "Géraldine Roux",
        "description": "Le plus grand philosophe juif médiéval (1138-1204).",
        "episodes": 4
    }
]

async def update_database():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("=== Mise à jour des Cursus (Thématiques) ===")
    
    # Update thematiques
    for th in THEMATIQUES:
        existing = await db.thematiques.find_one({"id": th["id"]})
        if existing:
            await db.thematiques.update_one(
                {"id": th["id"]},
                {"$set": {
                    "title": th["title"],
                    "description": th["description"],
                    "icon": th["icon"],
                    "order": th["order"],
                    "is_active": True,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            print(f"  [MAJ] {th['title']}")
        else:
            await db.thematiques.insert_one({
                **th,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            print(f"  [NEW] {th['title']}")
    
    print(f"\n  Total cursus: {len(THEMATIQUES)}")
    
    print("\n=== Mise à jour des Cours ===")
    
    # Get scholars for mapping names
    scholars = {s["name"]: s["id"] async for s in db.scholars.find({}, {"id": 1, "name": 1})}
    
    for course in COURSES:
        # Try to find scholar_id from name
        scholar_id = None
        if course.get("scholar_name") and course["scholar_name"] in scholars:
            scholar_id = scholars[course["scholar_name"]]
        
        existing = await db.courses.find_one({"id": course["id"]})
        if existing:
            await db.courses.update_one(
                {"id": course["id"]},
                {"$set": {
                    "title": course["title"],
                    "description": course["description"],
                    "thematique_id": course["thematique_id"],
                    "scholar_name": course.get("scholar_name"),
                    "scholar_id": scholar_id,
                    "episode_count": course.get("episodes", 1),
                    "is_active": True,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            print(f"  [MAJ] {course['title']}")
        else:
            await db.courses.insert_one({
                "id": course["id"],
                "title": course["title"],
                "description": course["description"],
                "thematique_id": course["thematique_id"],
                "scholar_id": scholar_id,
                "scholar_name": course.get("scholar_name"),
                "episode_count": course.get("episodes", 1),
                "thumbnail": "",
                "video_url": "",
                "duration": 0,
                "is_active": True,
                "is_featured": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            print(f"  [NEW] {course['title']}")
    
    print(f"\n  Total cours: {len(COURSES)}")
    
    # Count courses per thematique
    print("\n=== Répartition par cursus ===")
    for th in THEMATIQUES:
        count = await db.courses.count_documents({"thematique_id": th["id"]})
        print(f"  {th['title']}: {count} cours")
    
    client.close()
    print("\n✅ Mise à jour terminée!")

if __name__ == "__main__":
    asyncio.run(update_database())
