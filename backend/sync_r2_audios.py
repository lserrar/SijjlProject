"""
Script de synchronisation des fichiers audio R2 avec les modules en base de données.
Ce script:
1. Vide la collection audios existante (données obsolètes)
2. Crée des entrées audio liées aux modules correspondants

Lancer avec: python3 /app/backend/sync_r2_audios.py
"""
import os
import uuid
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / '.env')

client = MongoClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

# Mapping complet: clé R2 → module_id en base de données
AUDIO_MAPPING = {
    # ── Cursus A : La Falsafa et son héritage ──────────────────────────────
    'Audio/cursus-a-falsafa/01-mouvement-traduction/episode-01.m4a': 'cours-traduction-mod-1',

    'Audio/cursus-a-falsafa/02-falsafa/al-kindi/episode-01.m4a':              'cours-falsafa-grands-mod-1',
    'Audio/cursus-a-falsafa/02-falsafa/al-farabi/episode-01.m4a':             'cours-falsafa-grands-mod-2',
    'Audio/cursus-a-falsafa/02-falsafa/avicenne/episode-01.m4a':              'cours-falsafa-grands-mod-3',
    'Audio/cursus-a-falsafa/02-falsafa/avicenne-monde-latin/episode-01.m4a':  'cours-falsafa-grands-mod-4',
    'Audio/cursus-a-falsafa/02-falsafa/disciples-avicenne/episode-01.m4a':    'cours-falsafa-grands-mod-7',

    'Audio/cursus-a-falsafa/03-post-avicennisme/al-ghazali/episode-01.m4a':              'cours-post-avicennisme-mod-1',
    'Audio/cursus-a-falsafa/03-post-avicennisme/al-ghazali-occident-latin/episode-01.m4a': 'cours-post-avicennisme-mod-8',
    'Audio/cursus-a-falsafa/03-post-avicennisme/nasir-al-din-al-tusi/episode-01.m4a':    'cours-post-avicennisme-mod-9',
    'Audio/cursus-a-falsafa/03-post-avicennisme/fakhr-al-din-al-razi/episode-01.m4a':    'cours-post-avicennisme-mod-10',

    'Audio/cursus-a-falsafa/04-falsafa-occident-musulman/ibn-bajja/episode-01.m4a':           'cours-falsafa-occident-mod-1',
    'Audio/cursus-a-falsafa/04-falsafa-occident-musulman/ibn-tufayl/episode-01.m4a':          'cours-falsafa-occident-mod-2',
    'Audio/cursus-a-falsafa/04-falsafa-occident-musulman/averroes/episode-01.m4a':            'cours-falsafa-occident-mod-3',
    'Audio/cursus-a-falsafa/04-falsafa-occident-musulman/posterite-latine-averroes/episode-01.m4a': 'cours-falsafa-occident-mod-4',

    'Audio/cursus-a-falsafa/05-renouveau-falsafa-persan/suhrawardi/episode-01.m4a':    'cours-falsafa-persan-mod-1',
    'Audio/cursus-a-falsafa/05-renouveau-falsafa-persan/shahrazuri/episode-01.m4a':    'cours-falsafa-persan-mod-2',
    'Audio/cursus-a-falsafa/05-renouveau-falsafa-persan/ibn-kammuna/episode-01.m4a':   'cours-falsafa-persan-mod-3',
    'Audio/cursus-a-falsafa/05-renouveau-falsafa-persan/mir-fendereski/episode-01.m4a': 'cours-falsafa-persan-mod-4',
    'Audio/cursus-a-falsafa/05-renouveau-falsafa-persan/shaykh-bahai/episode-01.m4a':  'cours-falsafa-persan-mod-5',
    'Audio/cursus-a-falsafa/05-renouveau-falsafa-persan/mir-damad/episode-01.m4a':     'cours-falsafa-persan-mod-6',

    'Audio/cursus-a-falsafa/06-logique-arabe/episode-01.m4a': 'cours-logique-mod-1',

    'Audio/cursus-a-falsafa/07-inclassables/ibn-hazm/episode-01.m4a':            'cours-inclassables-mod-1',
    'Audio/cursus-a-falsafa/07-inclassables/ibn-khaldun-philosophie/episode-01.m4a': 'cours-inclassables-mod-2',
    'Audio/cursus-a-falsafa/07-inclassables/al-amiri/episode-01.m4a':            'cours-inclassables-mod-3',
    'Audio/cursus-a-falsafa/07-inclassables/miskawayh/episode-01.m4a':           'cours-inclassables-mod-4',
    'Audio/cursus-a-falsafa/07-inclassables/abu-al-barakat/episode-01.m4a':      'cours-inclassables-mod-5',

    # ── Cursus B : Théologie et Droit ──────────────────────────────────────
    'Audio/cursus-b-theologie-droit/08-kalam/avant-mutazilisme/episode-01.m4a':  'cours-kalam-mod-1',
    'Audio/cursus-b-theologie-droit/08-kalam/phase-intermediaire/episode-01.m4a': 'cours-kalam-mod-2',
    'Audio/cursus-b-theologie-droit/08-kalam/kalam-tardif/episode-01.m4a':       'cours-kalam-mod-3',
    'Audio/cursus-b-theologie-droit/08-kalam/ibn-taymiyya/episode-01.m4a':       'cours-kalam-mod-4',

    'Audio/cursus-b-theologie-droit/09-usul-al-fiqh/quatre-ecoles/episode-01.m4a': 'cours-fiqh-mod-1',
    'Audio/cursus-b-theologie-droit/09-usul-al-fiqh/droit-musulman/episode-01.m4a': 'cours-fiqh-mod-2',

    # ── Cursus C : Sciences islamiques et transmission ─────────────────────
    'Audio/cursus-c-sciences-islamiques/10-doxographie/ibn-al-nadim/episode-01.m4a': 'cours-doxographie-mod-1',
    'Audio/cursus-c-sciences-islamiques/10-doxographie/hajji-khalifa/episode-01.m4a': 'cours-doxographie-mod-2',
    'Audio/cursus-c-sciences-islamiques/10-doxographie/tashkoprizade/episode-01.m4a': 'cours-doxographie-mod-3',

    'Audio/cursus-c-sciences-islamiques/11-transmission-coran/episode-01.m4a': 'cours-coran-mod-1',

    'Audio/cursus-c-sciences-islamiques/12-transmission-hadith/chiisme/episode-01.m4a':  'cours-hadith-mod-1',
    'Audio/cursus-c-sciences-islamiques/12-transmission-hadith/sunnisme/episode-01.m4a': 'cours-hadith-mod-2',

    'Audio/cursus-c-sciences-islamiques/13-historiographie/ibn-battuta/episode-01.m4a':     'cours-historiographie-mod-1',
    'Audio/cursus-c-sciences-islamiques/13-historiographie/ibn-khaldun-histoire/episode-01.m4a': 'cours-historiographie-mod-2',
    'Audio/cursus-c-sciences-islamiques/13-historiographie/al-maqrizi/episode-01.m4a':      'cours-historiographie-mod-3',
    'Audio/cursus-c-sciences-islamiques/13-historiographie/al-tabari/episode-01.m4a':       'cours-historiographie-mod-4',
    'Audio/cursus-c-sciences-islamiques/13-historiographie/ibn-kathir/episode-01.m4a':      'cours-historiographie-mod-5',

    'Audio/cursus-c-sciences-islamiques/14-autobiographies/episode-01.m4a': 'cours-autobiographies-mod-1',

    # ── Cursus D : Arts, Littérature et Sciences ───────────────────────────
    'Audio/cursus-d-arts-litterature/15-histoire-art/episode-01.m4a': 'cours-art-mod-1',

    'Audio/cursus-d-arts-litterature/16-poesie/monde-preislamique/episode-01.m4a': 'cours-poesie-mod-1',
    'Audio/cursus-d-arts-litterature/16-poesie/monde-arabe/episode-01.m4a':        'cours-poesie-mod-2',
    'Audio/cursus-d-arts-litterature/16-poesie/monde-persan/episode-01.m4a':       'cours-poesie-mod-3',

    'Audio/cursus-d-arts-litterature/18-sciences/biologie/episode-01.m4a':     'cours-sciences-mod-1',
    'Audio/cursus-d-arts-litterature/18-sciences/al-jahiz/episode-01.m4a':     'cours-sciences-mod-2',
    'Audio/cursus-d-arts-litterature/18-sciences/astronomie/episode-01.m4a':   'cours-sciences-mod-3',
    'Audio/cursus-d-arts-litterature/18-sciences/mathematiques/episode-01.m4a': 'cours-sciences-mod-4',

    # ── Cursus E : Philosophies et spiritualités connexes ──────────────────
    'Audio/cursus-e-spiritualites/19-kalam-chretien/yahya-ibn-adi/episode-01.m4a':   'cours-kalam-chretien-mod-1',
    'Audio/cursus-e-spiritualites/19-kalam-chretien/thabit-ibn-qurra/episode-01.m4a': 'cours-kalam-chretien-mod-2',

    'Audio/cursus-e-spiritualites/20-mystique-islamique/premier-tasawwuf/episode-01.m4a': 'cours-soufisme-mod-1',
    'Audio/cursus-e-spiritualites/20-mystique-islamique/ibn-arabi/episode-01.m4a':        'cours-soufisme-mod-2',
    'Audio/cursus-e-spiritualites/20-mystique-islamique/soufisme-iranien/episode-01.m4a': 'cours-soufisme-mod-3',
    'Audio/cursus-e-spiritualites/20-mystique-islamique/nafisi/episode-01.m4a':            'cours-soufisme-mod-4',
    'Audio/cursus-e-spiritualites/20-mystique-islamique/soufisme-philosophie/episode-01.m4a': 'cours-soufisme-mod-5',

    'Audio/cursus-e-spiritualites/21-ismaelisme/histoire/episode-01.m4a':    'cours-ismaelisme-mod-1',
    'Audio/cursus-e-spiritualites/21-ismaelisme/philosophie/episode-01.m4a': 'cours-ismaelisme-mod-2',

    'Audio/cursus-e-spiritualites/22-philosophie-juive/dawud-al-muqammis/episode-01.m4a': 'cours-philo-juive-mod-1',
    'Audio/cursus-e-spiritualites/22-philosophie-juive/isaac-israeli/episode-01.m4a':     'cours-philo-juive-mod-2',
    'Audio/cursus-e-spiritualites/22-philosophie-juive/saadya-gaon/episode-01.m4a':       'cours-philo-juive-mod-3',
    'Audio/cursus-e-spiritualites/22-philosophie-juive/ibn-gabirol/episode-01.m4a':       'cours-philo-juive-mod-4',
    'Audio/cursus-e-spiritualites/22-philosophie-juive/bahya-ibn-paquda/episode-01.m4a':  'cours-philo-juive-mod-5',
    'Audio/cursus-e-spiritualites/22-philosophie-juive/judah-halevi/episode-01.m4a':      'cours-philo-juive-mod-6',
    'Audio/cursus-e-spiritualites/22-philosophie-juive/natanel-al-fayyumi/episode-01.m4a': 'cours-philo-juive-mod-7',
    'Audio/cursus-e-spiritualites/22-philosophie-juive/abraham-ibn-daud/episode-01.m4a':  'cours-philo-juive-mod-8',
    'Audio/cursus-e-spiritualites/22-philosophie-juive/maimonide/episode-01.m4a':         'cours-philo-juive-mod-9',
}


def run_sync():
    now = datetime.now(timezone.utc).isoformat()

    # 1. Charger tous les modules dans un dict pour accès rapide
    modules_by_id = {}
    for m in db.modules.find({}, {'_id': 0}):
        modules_by_id[m['id']] = m

    print(f"Modules chargés : {len(modules_by_id)}")

    # 2. Vider l'ancienne collection audios
    deleted = db.audios.delete_many({})
    print(f"Anciens audios supprimés : {deleted.deleted_count}")

    # 3. Créer les nouveaux documents audio
    new_audios = []
    missing_modules = []

    for file_key, module_id in AUDIO_MAPPING.items():
        module = modules_by_id.get(module_id)
        if not module:
            missing_modules.append((file_key, module_id))
            continue

        audio_id = f"aud_{module_id}"
        # Titre: "Épisode 1 — {nom du module}"
        title = f"Épisode 1 — {module['name']}"

        doc = {
            'id': audio_id,
            'title': title,
            'module_id': module_id,
            'course_id': module.get('course_id', ''),
            'file_key': file_key,
            'episode_number': 1,
            'type': 'episode',
            'is_active': True,
            'created_at': now,
            'duration': 0,  # Durée inconnue, sera mise à jour si nécessaire
        }
        new_audios.append(doc)

    if new_audios:
        db.audios.insert_many(new_audios)
        print(f"Audios créés : {len(new_audios)}")

    if missing_modules:
        print(f"\nATTENTION - Modules non trouvés ({len(missing_modules)}) :")
        for fk, mid in missing_modules:
            print(f"  {fk} -> {mid}")

    # 4. Vérification
    total = db.audios.count_documents({})
    linked = db.audios.count_documents({'module_id': {'$exists': True, '$ne': ''}})
    print(f"\nRésultat final : {total} audios en base, {linked} liés à un module")
    print("Synchronisation terminée !")


if __name__ == '__main__':
    run_sync()
