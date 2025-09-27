# API Documentation - Sistema Tracking Recupero Moduli Docenti

## Base URL
```
http://localhost:3000/api (development)
https://your-domain.vercel.app/api (production)
```

## Authentication
Le API utilizzano Supabase Authentication. Include l'header Authorization:
```
Authorization: Bearer <supabase_jwt_token>
```

## Content-Type
Tutte le richieste POST/PUT devono utilizzare:
```
Content-Type: application/json
```

---

## Teachers API

### GET /api/teachers
Recupera lista docenti con paginazione e ricerca.

**Query Parameters:**
- `page` (number, default: 1): Numero pagina
- `limit` (number, default: 10): Elementi per pagina (max 100)
- `search` (string): Ricerca per nome, cognome o email

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "nome": "string",
      "cognome": "string",
      "email": "string|null",
      "userId": "uuid|null",
      "createdAt": "datetime",
      "updatedAt": "datetime",
      "user": {
        "id": "uuid",
        "role": "string",
        "email": "string"
      },
      "teacherBudgets": [
        {
          "id": "uuid",
          "schoolYear": {
            "id": "uuid",
            "name": "string",
            "isActive": "boolean"
          },
          "minutesAnnual": "number",
          "minutesUsed": "number"
        }
      ],
      "_count": {
        "recoveryActivities": "number"
      }
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "pages": "number"
  }
}
```

### POST /api/teachers
Crea nuovo docente.

**Body:**
```json
{
  "nome": "string (required)",
  "cognome": "string (required)",
  "email": "string (optional)",
  "userId": "uuid (optional)"
}
```

### GET /api/teachers/[id]
Recupera dettagli singolo docente.

### PUT /api/teachers/[id]
Aggiorna docente esistente.

### DELETE /api/teachers/[id]
Elimina docente (solo se non ha dati collegati).

---

## Budgets API

### GET /api/budgets
Recupera tesoretti con filtri e paginazione.

**Query Parameters:**
- `page`, `limit`: Paginazione
- `teacherId` (uuid): Filtra per docente
- `schoolYearId` (uuid): Filtra per anno scolastico

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "teacherId": "uuid",
      "schoolYearId": "uuid",
      "minutesWeekly": "number",
      "minutesAnnual": "number",
      "modulesAnnual": "number",
      "minutesUsed": "number",
      "modulesUsed": "number",
      "importDate": "datetime",
      "importSource": "string",
      "teacher": {
        "id": "uuid",
        "nome": "string",
        "cognome": "string",
        "email": "string"
      },
      "schoolYear": {
        "id": "uuid",
        "name": "string",
        "isActive": "boolean"
      },
      "minutesRemaining": "number",
      "modulesRemaining": "number",
      "percentageUsed": "number"
    }
  ]
}
```

### POST /api/budgets
Crea nuovo tesoretto.

**Body:**
```json
{
  "teacherId": "uuid (required)",
  "schoolYearId": "uuid (required)",
  "minutesWeekly": "number (required)",
  "minutesAnnual": "number (required)",
  "modulesAnnual": "number (required)",
  "importSource": "string (optional, default: 'manual')"
}
```

### POST /api/budgets/import
Import massivo tesoretti da CSV.

**Body:**
```json
{
  "schoolYearId": "uuid (required)",
  "importSource": "string (optional, default: 'csv')",
  "records": [
    {
      "cognome": "string (required)",
      "nome": "string (required)",
      "email": "string (optional)",
      "minutesWeekly": "number (required)",
      "minutesAnnual": "number (required)",
      "modulesAnnual": "number (required)"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Import completato: 10 creati, 5 aggiornati",
  "results": {
    "created": 10,
    "updated": 5,
    "errors": ["Riga 3: Campi obbligatori mancanti"]
  }
}
```

---

## Activities API

### GET /api/activities
Recupera attività con filtri avanzati.

**Query Parameters:**
- `page`, `limit`: Paginazione
- `teacherId` (uuid): Filtra per docente
- `schoolYearId` (uuid): Filtra per anno scolastico
- `recoveryTypeId` (uuid): Filtra per tipologia
- `status` (string): Filtra per stato (pending, completed, rejected)
- `dateFrom` (date): Data inizio periodo
- `dateTo` (date): Data fine periodo

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "teacherId": "uuid",
      "schoolYearId": "uuid",
      "recoveryTypeId": "uuid",
      "date": "datetime",
      "durationMinutes": "number",
      "modulesEquivalent": "number",
      "title": "string",
      "description": "string|null",
      "status": "string",
      "createdBy": "uuid",
      "approvedBy": "uuid|null",
      "approvedAt": "datetime|null",
      "teacher": {
        "id": "uuid",
        "nome": "string",
        "cognome": "string"
      },
      "recoveryType": {
        "id": "uuid",
        "name": "string",
        "color": "string",
        "requiresApproval": "boolean"
      },
      "creator": {
        "id": "uuid",
        "name": "string",
        "email": "string"
      }
    }
  ]
}
```

### POST /api/activities
Crea nuova attività di recupero.

**Body:**
```json
{
  "teacherId": "uuid (required)",
  "schoolYearId": "uuid (required)",
  "recoveryTypeId": "uuid (required)",
  "date": "datetime (required)",
  "durationMinutes": "number (required)",
  "title": "string (required)",
  "description": "string (optional)",
  "createdBy": "uuid (required)"
}
```

**Business Logic:**
- Calcola automaticamente `modulesEquivalent` = Math.ceil(durationMinutes / 50)
- Verifica disponibilità budget docente
- Se tipologia richiede approvazione, stato = 'pending', altrimenti 'completed'
- Aggiorna budget solo se non richiede approvazione

### PUT /api/activities/[id]
Aggiorna attività esistente o gestisce approvazione.

**Body per aggiornamento:**
```json
{
  "date": "datetime (optional)",
  "durationMinutes": "number (optional)",
  "title": "string (optional)",
  "description": "string (optional)"
}
```

**Body per approvazione:**
```json
{
  "status": "approved|rejected",
  "approvedBy": "uuid (required per approvazione)"
}
```

---

## Recovery Types API

### GET /api/recovery-types
Recupera tipologie di recupero.

**Query Parameters:**
- `isActive` (boolean): Filtra per stato attivo
- `includeInactive` (boolean): Include quelle disattivate

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "string",
    "description": "string|null",
    "color": "string",
    "isActive": "boolean",
    "requiresApproval": "boolean",
    "defaultDuration": "number",
    "createdBy": "uuid",
    "creator": {
      "id": "uuid",
      "name": "string",
      "email": "string"
    },
    "_count": {
      "recoveryActivities": "number"
    }
  }
]
```

### POST /api/recovery-types
Crea nuova tipologia.

**Body:**
```json
{
  "name": "string (required, unique)",
  "description": "string (optional)",
  "color": "string (optional, default: '#3B82F6')",
  "isActive": "boolean (optional, default: true)",
  "requiresApproval": "boolean (optional, default: false)",
  "defaultDuration": "number (required, in minutes)",
  "createdBy": "uuid (required)"
}
```

---

## Reports API

### GET /api/reports/overview
Genera report overview completo del sistema.

**Query Parameters:**
- `schoolYearId` (uuid, optional): Filtra per anno scolastico

**Response:**
```json
{
  "summary": {
    "totalTeachers": "number",
    "totalBudgets": "number",
    "totalActivities": "number",
    "utilizationPercentage": "number",
    "activeSchoolYear": {
      "id": "uuid",
      "name": "string",
      "startDate": "datetime",
      "endDate": "datetime"
    }
  },
  "budgets": {
    "totalMinutesAnnual": "number",
    "totalMinutesUsed": "number",
    "totalMinutesRemaining": "number",
    "totalModulesAnnual": "number",
    "totalModulesUsed": "number",
    "totalModulesRemaining": "number",
    "averageMinutesAnnual": "number",
    "averageMinutesUsed": "number"
  },
  "activities": {
    "byType": [
      {
        "recoveryTypeId": "uuid",
        "_count": { "id": "number" },
        "_sum": {
          "durationMinutes": "number",
          "modulesEquivalent": "number"
        },
        "recoveryType": {
          "name": "string",
          "color": "string"
        }
      }
    ],
    "byStatus": [
      {
        "status": "string",
        "_count": { "id": "number" }
      }
    ],
    "totalDuration": "number",
    "totalModules": "number"
  },
  "topTeachers": [
    {
      "teacher": "string",
      "minutesUsed": "number",
      "minutesAnnual": "number",
      "utilizationPercentage": "number"
    }
  ]
}
```

---

## Error Responses

Tutte le API ritornano errori in formato standard:

```json
{
  "error": "Messaggio errore descrittivo"
}
```

**Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request (validazione fallita)
- `404`: Not Found
- `500`: Internal Server Error

## Business Rules

### Calcolo Moduli
- 1 modulo = 50 minuti
- `modulesEquivalent` = Math.ceil(durationMinutes / 50)

### Validazione Budget
- Prima di creare/aggiornare attività, verifica disponibilità budget
- `minutesUsed + newMinutes <= minutesAnnual`
- `modulesUsed + newModules <= modulesAnnual`

### Workflow Approvazione
1. Attività con `requiresApproval = true` → status = 'pending'
2. Admin approva → status = 'completed' + aggiorna budget
3. Admin rifiuta → status = 'rejected'

### Integrità Dati
- Non eliminare docenti con tesoretti o attività
- Non eliminare tesoretti con attività collegate
- Non eliminare tipologie con attività collegate

### Audit Trail
- Ogni operazione CUD dovrebbe loggare in `activity_logs`
- Traccia: user_id, action, table_name, old_values, new_values