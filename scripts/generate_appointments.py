import json
import random
from datetime import date, datetime, timedelta, time
from pathlib import Path

APPOINTMENTS_COUNT = 200
PER_DAY = 20
START_DATE = date(2025, 11, 19)
HOURS = list(range(12, 23))  # 12:00 through 22:00
API_PATH = "/appointment/api/appointment/scheduleAppointment"
BASE_URL_PLACEHOLDER = "${BASE_URL:-https://salep.sce.manh.com}"
TOKEN_PLACEHOLDER = "${AUTH_TOKEN:-REPLACE_WITH_TOKEN}"
ORG_PLACEHOLDER = "${ORG_ID:-SS-DEMO}"

BASE_DIR = Path(__file__).resolve().parents[1]
JSON_OUTPUT = BASE_DIR / "test-data" / "appointments_v0.json"
CURL_SH_OUTPUT = BASE_DIR / "test-data" / "appointments_v0_curl.sh"
CURL_PS_OUTPUT = BASE_DIR / "test-data" / "appointments_v0_curl.ps1"

random.seed(42)


def generate():
    appointments = []
    appointment_index = 1
    current_day = START_DATE

    while len(appointments) < APPOINTMENTS_COUNT:
        times_for_day = random.choices(HOURS, k=PER_DAY)
        times_for_day.sort()

        for hour in times_for_day:
            if len(appointments) >= APPOINTMENTS_COUNT:
                break

            dt = datetime.combine(current_day, time(hour=hour))
            payload = {
                "AppointmentId": f"APTSID{appointment_index:03d}",
                "AppointmentTypeId": "DROP_UNLOAD",
                "EquipmentTypeId": "48FT",
                "PreferredDateTime": dt.strftime("%Y-%m-%dT%H:00:00"),
                "Duration": 60,
                "AppointmentStatusId": "3000"
            }
            appointments.append(payload)
            appointment_index += 1

        current_day += timedelta(days=1)

    return appointments


def write_json(data):
    JSON_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with JSON_OUTPUT.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"Wrote {len(data)} appointments to {JSON_OUTPUT}")


def write_curl_scripts(data):
    CURL_SH_OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    sh_lines = [
        "#!/usr/bin/env bash",
        f'BASE_URL="{BASE_URL_PLACEHOLDER}"',
        f'AUTH_TOKEN="{TOKEN_PLACEHOLDER}"',
        f'ORG_ID="{ORG_PLACEHOLDER}"',
        "",
        "echo \"Posting appointments to $BASE_URL{0}\"".format(API_PATH),
        "echo \"Using org $ORG_ID\"",
        ""
    ]

    ps_lines = [
        "# PowerShell helper to POST generated appointments",
        "$baseUrl = $env:BASE_URL",
        "if (-not $baseUrl) { $baseUrl = 'https://salep.sce.manh.com' }",
        "$token = $env:AUTH_TOKEN",
        "if (-not $token) { $token = 'REPLACE_WITH_TOKEN' }",
        "$orgId = $env:ORG_ID",
        "if (-not $orgId) { $orgId = 'SS-DEMO' }",
        f"Write-Host \"Posting appointments to $baseUrl{API_PATH} for org $orgId\"",
        ""
    ]

    for appt in data:
        payload = json.dumps(appt)
        sh_lines.append(
            f"curl -s -X POST \"$BASE_URL{API_PATH}\" "
            f"-H \"Content-Type: application/json\" "
            f"-H \"Authorization: Bearer $AUTH_TOKEN\" "
            f"-H \"selectedOrganization: $ORG_ID\" "
            f"-H \"selectedLocation: $ORG_ID-DM1\" "
            f"-d '{payload}'"
        )
        ps_lines.append(
            "curl.exe -s -X POST "
            f"\"$baseUrl{API_PATH}\" "
            "-H \"Content-Type: application/json\" "
            "-H \"Authorization: Bearer $token\" "
            "-H \"selectedOrganization: $orgId\" "
            "-H \"selectedLocation: $($orgId)-DM1\" "
            f"-d '{payload}'"
        )

    CURL_SH_OUTPUT.write_text("\n".join(sh_lines) + "\n", encoding="utf-8")
    CURL_PS_OUTPUT.write_text("\n".join(ps_lines) + "\n", encoding="utf-8")

    print(f"Wrote bash curl helpers to {CURL_SH_OUTPUT}")
    print(f"Wrote PowerShell curl helpers to {CURL_PS_OUTPUT}")


def main():
    data = generate()
    write_json(data)
    write_curl_scripts(data)


if __name__ == "__main__":
    main()

