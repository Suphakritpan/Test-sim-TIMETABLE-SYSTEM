# Conflict Tools

Dependency-free schedule validator for the Node.js / plain JavaScript stack in the
project README. The validator is independent of any scheduler: pass a proposed
schedule to it before accepting or exporting that schedule.

## Run

```sh
node --test "conflict tools/validate.test.mjs"
node "conflict tools/cli.mjs" schedule.json
node "conflict tools/cli.mjs" schedule.json --json
```

Exit codes: `0` means no violations, `1` means hard scheduling violations, and `2`
means malformed input or a file/JSON read error. The JSON report groups findings by
rule and includes entity IDs and affected day/period slots so a UI or API can consume
the same result.

## Input contract (schema version 1)

The CLI accepts one JSON object with these fields:

```json
{
  "schemaVersion": 1,
  "calendar": { "days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "periodsPerDay": 11 },
  "levels": [{ "id": "l1", "name": "ปวช.1", "maxPeriod": 9 }],
  "groups": [{ "id": "g1", "levelId": "l1" }],
  "subjects": [{
    "id": "s1",
    "name": "Subject",
    "levelId": "l1",
    "periods": 2,
    "kind": "theory",
    "category": "department",
    "roomClass": "DEPARTMENT",
    "groupIds": ["g1"]
  }],
  "teachers": [{
    "id": "t1",
    "name": "Teacher",
    "role": "other",
    "maxTeachingLoad": 38,
    "unavailable": [{ "day": "Wed", "startPeriod": 1, "endPeriod": 4 }]
  }],
  "rooms": [{
    "id": "r1",
    "name": "Room",
    "type": "DEPARTMENT",
    "unavailable": []
  }],
  "lunches": [{ "levelId": "l1", "day": "Mon", "period": 4 }],
  "sessions": [{
    "id": "x1",
    "subjectId": "s1",
    "groupIds": ["g1"],
    "teacherId": "t1",
    "roomId": "r1",
    "day": "Mon",
    "startPeriod": 1,
    "length": 2
  }]
}
```

Create one lunch entry for every level and weekday. Theory and activity subjects use
one merged session containing all of the subject's `groupIds`; practical subjects use
one separate session per group. Each session is a single contiguous block. Room types
are `COM`, `LAB`, `EXTERNAL`, or `DEPARTMENT`; subject room classes are `COM`, `LAB`,
`COM_OR_LAB`, `GENERAL`, or `DEPARTMENT`. Computer room IDs or names must be COM1–COM4
and lab room IDs or names must be LAB1–LAB2. General-category subjects must use an
`EXTERNAL` room, and external rooms are reusable.

Teacher roles `head_dept` and `head_work` are checked against 24–28 department periods;
`regular` is checked against 30–38. Other roles do not have a department-hours band.
`maxTeachingLoad` counts all assigned teaching periods, including general subjects;
the role bands exclude general subjects as required by H11. Activity sessions must
occupy Thursday periods 6–7.

## Rule notes

- H2 means teachers are not required to take a break; the validator does not prohibit
  teaching during a student lunch period.
- H3 checks the declared lunch period is 4, 5, or 6 and that no group of the level is
  scheduled then.
- H10 checks that a subject is not split into multiple blocks for the same attendees.
- H15 checks one block of the required duration for each required attendance unit.
- The report identifies direct violations; it is not an unsatisfiable-core solver and
  does not claim a mathematically minimal blocking set.
- The source workbook does not assign teachers to subjects, so teacher assignments
  and max loads must be supplied in the schedule input. The validator reports missing
  references rather than inventing assignments.
