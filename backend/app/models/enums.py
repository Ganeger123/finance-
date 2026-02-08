from enum import Enum

class ExpenseCategory(str, Enum):
    SALAIRE_FIXE = "Salaire fixe"
    COMMISSION_VENDEUR = "Commission vendeur"
    REMUNERATION_TOTALE = "Rémunération totale des vendeurs"
    ANNONCE_PUB = "Annonce publicitaire"
    CREDIT_TEL = "Crédit de téléphone"
    LOCATION_LOCAL = "Location de local"
    IMPRESSION = "Impression"
    PHOTOCOPIE = "Photocopie"
    TRANSPORT = "Transport"
    LOCATION_GENERATRICE = "Location de génératrice"
    CARBURANT_GENERATRICE = "Carburant génératrice"
    MATERIELS_OUTILS = "Matériels / outils de travail"
    UNIFORME_STAFF = "Uniforme du staff"

class IncomeType(str, Enum):
    FORMATION_CAMERA = "Formation Caméra"
    FORMATION_ELECTRICITE = "Formation Électricité"
    PLATFORM = "Platform"

class IncomeSubtype(str, Enum):
    INSCRIPTION = "Inscription"
    PARTICIPATION = "Participation"
    CUSTOM = "Custom"
