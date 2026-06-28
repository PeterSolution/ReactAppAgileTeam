import os
import sys
import time
import subprocess
import socket
import random
import string
import json

# Check/Install requests
try:
    import requests
except ImportError:
    print("[INFO] Biblioteka 'requests' nie jest zainstalowana. Instalowanie...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
        import requests
        print("[INFO] Biblioteka 'requests' zainstalowana pomyślnie.")
    except Exception as e:
        print(f"[ERROR] Nie udało się zainstalować biblioteki 'requests': {e}")
        sys.exit(1)

def is_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1.0)
        return s.connect_ex(('127.0.0.1', port)) == 0

def kill_process_on_port(port):
    try:
        # netstat returns list of connections with PIDs
        output = subprocess.check_output(f"netstat -ano | findstr :{port}", shell=True, text=True)
        pids = set()
        for line in output.splitlines():
            parts = line.strip().split()
            if len(parts) >= 5 and "LISTENING" in line:
                pid = parts[-1]
                pids.add(pid)
        for pid in pids:
            print(f"[INFO] Zamykanie procesu o PID {pid} na porcie {port}...")
            # /F forces termination, /T terminates child processes too
            subprocess.run(f"taskkill /F /T /PID {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        # Command fails if no processes are on port, which is fine
        pass

def run_tests():
    base_url = "http://localhost:8080"
    
    # Generate unique test data
    random_suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    student_email = f"student_{random_suffix}@test.pl"
    lecturer_email = f"wykladowca_{random_suffix}@test.pl"
    student_name = f"Jan_{random_suffix}"
    lecturer_name = f"Adam_{random_suffix}"
    
    # State variables
    student_token = None
    lecturer_token = None
    student_id = None
    lecturer_id = None
    project_id = None
    task_id = None
    comment_id = None
    file_id = None
    
    # List of test steps
    tests = []
    
    # Helper to append tests
    def test_step(name, func):
        tests.append((name, func))
        
    # --- TEST 1 ---
    def t1():
        url = f"{base_url}/api/auth/register"
        payload = {
            "email": student_email,
            "password": "password123",
            "firstName": student_name,
            "lastName": "Kowalski",
            "indexNumber": f"1{random.randint(10000, 99999)}",
            "studyMode": "stacjonarne"
        }
        res = requests.post(url, json=payload, timeout=5)
        if res.status_code != 200:
            return False, f"Status code {res.status_code}, response: {res.text}"
        data = res.json()
        if not data.get("success"):
            return False, f"success field is not true: {data}"
        return True, None
    test_step("Rejestracja Studenta", t1)
    
    # --- TEST 2 ---
    def t2():
        url = f"{base_url}/api/auth/register"
        payload = {
            "email": lecturer_email,
            "password": "password123",
            "firstName": lecturer_name,
            "lastName": "Nowak",
            "lecturerKey": "SecretLecturer123"
        }
        res = requests.post(url, json=payload, timeout=5)
        if res.status_code != 200:
            return False, f"Status code {res.status_code}, response: {res.text}"
        data = res.json()
        if not data.get("success"):
            return False, f"success field is not true: {data}"
        return True, None
    test_step("Rejestracja Prowadzącego", t2)
    
    # --- TEST 3 ---
    def t3():
        nonlocal student_token
        url = f"{base_url}/api/auth/login"
        payload = {
            "email": student_email,
            "password": "password123"
        }
        res = requests.post(url, json=payload, timeout=5)
        if res.status_code != 200:
            return False, f"Status code {res.status_code}, response: {res.text}"
        data = res.json()
        student_token = data.get("accessToken")
        if not student_token:
            return False, "Brak accessToken w odpowiedzi logowania"
        if data.get("rola") != "ROLE_STUDENT":
            return False, f"Niepoprawna rola: {data.get('rola')}"
        return True, None
    test_step("Logowanie Studenta", t3)
    
    # --- TEST 4 ---
    def t4():
        nonlocal lecturer_token, lecturer_id
        url = f"{base_url}/api/auth/login"
        payload = {
            "email": lecturer_email,
            "password": "password123"
        }
        res = requests.post(url, json=payload, timeout=5)
        if res.status_code != 200:
            return False, f"Status code {res.status_code}, response: {res.text}"
        data = res.json()
        lecturer_token = data.get("accessToken")
        lecturer_id = data.get("id")
        if not lecturer_token:
            return False, "Brak accessToken w odpowiedzi logowania"
        if data.get("rola") != "ROLE_PROWADZACY":
            return False, f"Niepoprawna rola: {data.get('rola')}"
        return True, None
    test_step("Logowanie Prowadzącego", t4)
    
    # --- TEST 5 ---
    def t5():
        nonlocal student_id
        url = f"{base_url}/api/students"
        headers = {"Authorization": f"Bearer {lecturer_token}"}
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code != 200:
            return False, f"Status code {res.status_code}, response: {res.text}"
        students = res.json()
        for s in students:
            if s.get("email") == student_email:
                student_id = s.get("id")
                break
        if not student_id:
            return False, f"Nie znaleziono zarejestrowanego studenta na liście: {student_email}"
        return True, None
    test_step("Pobranie listy studentów", t5)
    
    # --- TEST 6 ---
    def t6():
        nonlocal project_id
        url = f"{base_url}/api/projects"
        headers = {"Authorization": f"Bearer {lecturer_token}"}
        payload = {
            "nazwa": f"Projekt Testowy {random_suffix}",
            "opis": "Automatycznie generowany projekt testowy do weryfikacji",
            "dataOddania": "2026-12-31"
        }
        res = requests.post(url, json=payload, headers=headers, timeout=5)
        if res.status_code != 200:
            return False, f"Status code {res.status_code}, response: {res.text}"
        proj = res.json()
        project_id = proj.get("id")
        if not project_id:
            return False, "Brak id nowo utworzonego projektu"
        return True, None
    test_step("Utworzenie projektu", t6)
    
    # --- TEST 7 ---
    def t7():
        url = f"{base_url}/api/projects/{project_id}/students/{student_id}"
        headers = {"Authorization": f"Bearer {lecturer_token}"}
        res = requests.post(url, headers=headers, timeout=5)
        if res.status_code != 200:
            return False, f"Status code {res.status_code}, response: {res.text}"
        data = res.json()
        if not data.get("success"):
            return False, f"success field is not true: {data}"
        return True, None
    test_step("Dodanie studenta do projektu", t7)
    
    # --- TEST 8 ---
    def t8():
        url = f"{base_url}/api/projects"
        headers = {"Authorization": f"Bearer {student_token}"}
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code != 200:
            return False, f"Status code {res.status_code}, response: {res.text}"
        data = res.json()
        content = data.get("content", [])
        found = False
        for p in content:
            if p.get("id") == project_id:
                found = True
                break
        if not found:
            return False, f"Projekt o ID {project_id} nie został znaleziony na liście studenta"
        return True, None
    test_step("Pobranie projektów studenta", t8)
    
    # --- TEST 9 ---
    def t9():
        nonlocal task_id
        url = f"{base_url}/api/projects/{project_id}/tasks"
        headers = {"Authorization": f"Bearer {lecturer_token}"}
        payload = {
            "nazwa": f"Zadanie Testowe {random_suffix}",
            "opis": "Do zrobienia przez studenta",
            "status": "TODO",
            "deadline": "2026-11-30"
        }
        res = requests.post(url, json=payload, headers=headers, timeout=5)
        if res.status_code != 200:
            return False, f"Status code {res.status_code}, response: {res.text}"
        task = res.json()
        task_id = task.get("id")
        if not task_id:
            return False, "Brak id nowo utworzonego zadania"
        return True, None
    test_step("Utworzenie zadania w projekcie", t9)
    
    # --- TEST 10 ---
    def t10():
        url = f"{base_url}/api/tasks/{task_id}/assign/{student_id}"
        headers = {"Authorization": f"Bearer {lecturer_token}"}
        res = requests.post(url, headers=headers, timeout=5)
        if res.status_code != 200:
            return False, f"Status code {res.status_code}, response: {res.text}"
        task = res.json()
        assigned = task.get("przypisanyStudent")
        if not assigned or assigned.get("id") != student_id:
            return False, f"Student nie został przypisany poprawnie: {assigned}"
        return True, None
    test_step("Przypisanie studenta do zadania", t10)
    
    # --- TEST 11 ---
    def t11():
        url = f"{base_url}/api/tasks/{task_id}"
        headers = {"Authorization": f"Bearer {student_token}"}
        payload = {
            "nazwa": f"Zadanie Testowe {random_suffix} - W toku",
            "opis": "Zadanie w trakcie realizacji przez studenta",
            "status": "IN_PROGRESS",
            "deadline": "2026-11-30"
        }
        res = requests.put(url, json=payload, headers=headers, timeout=5)
        if res.status_code != 200:
            return False, f"Status code {res.status_code}, response: {res.text}"
        task = res.json()
        if task.get("status") != "IN_PROGRESS":
            return False, f"Status zadania nie uległ zmianie na IN_PROGRESS: {task.get('status')}"
        return True, None
    test_step("Aktualizacja statusu zadania", t11)
    
    # --- TEST 12 ---
    def t12():
        nonlocal comment_id
        url = f"{base_url}/api/tasks/{task_id}/comments"
        headers = {"Authorization": f"Bearer {student_token}"}
        payload = {
            "tresc": "Komentarz testowy od studenta"
        }
        res = requests.post(url, json=payload, headers=headers, timeout=5)
        if res.status_code != 200:
            return False, f"Status code {res.status_code}, response: {res.text}"
        comment = res.json()
        comment_id = comment.get("id")
        if not comment_id:
            return False, "Brak id nowo utworzonego komentarza"
        if comment.get("tresc") != "Komentarz testowy od studenta":
            return False, f"Niepoprawna treść komentarza: {comment.get('tresc')}"
        return True, None
    test_step("Dodanie komentarza do zadania", t12)
    
    # --- TEST 13 ---
    def t13():
        url = f"{base_url}/api/tasks/{task_id}/comments"
        headers = {"Authorization": f"Bearer {student_token}"}
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code != 200:
            return False, f"Status code {res.status_code}, response: {res.text}"
        comments = res.json()
        found = False
        for c in comments:
            if c.get("id") == comment_id:
                found = True
                break
        if not found:
            return False, f"Komentarz o ID {comment_id} nie został odnaleziony na liście"
        return True, None
    test_step("Pobranie komentarzy do zadania", t13)
    
    # --- TEST 14 ---
    def t14():
        nonlocal file_id
        url = f"{base_url}/api/projects/{project_id}/files?taskId={task_id}"
        headers = {"Authorization": f"Bearer {student_token}"}
        # Prepare multipart file upload
        files = {
            "file": ("test_api_file.txt", b"To jest plik wygenerowany przez testy API.", "text/plain")
        }
        res = requests.post(url, files=files, headers=headers, timeout=5)
        if res.status_code != 200:
            return False, f"Status code {res.status_code}, response: {res.text}"
        metadata = res.json()
        file_id = metadata.get("id")
        if not file_id:
            return False, "Brak id w metadanych pliku"
        if metadata.get("nazwaPliku") != "test_api_file.txt":
            return False, f"Niepoprawna nazwa pliku: {metadata.get('nazwaPliku')}"
        return True, None
    test_step("Wysyłanie pliku do projektu", t14)
    
    # --- TEST 15 ---
    def t15():
        url = f"{base_url}/api/files/{file_id}"
        headers = {"Authorization": f"Bearer {student_token}"}
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code != 200:
            return False, f"Status code {res.status_code}, response: {res.text}"
        if b"To jest plik wygenerowany przez testy API." not in res.content:
            return False, f"Zawartość pobranego pliku jest inna: {res.content}"
        return True, None
    test_step("Pobranie załącznika", t15)
    
    # --- TEST 16 ---
    def t16():
        url = f"{base_url}/api/files/{file_id}"
        headers = {"Authorization": f"Bearer {student_token}"}
        res = requests.delete(url, headers=headers, timeout=5)
        if res.status_code != 200:
            return False, f"Status code {res.status_code}, response: {res.text}"
        data = res.json()
        if not data.get("success"):
            return False, f"success field is not true: {data}"
        return True, None
    test_step("Usunięcie załącznika", t16)
    
    # --- TEST 17 ---
    def t17():
        url = f"{base_url}/api/projects/{project_id}"
        headers = {"Authorization": f"Bearer {lecturer_token}"}
        res = requests.delete(url, headers=headers, timeout=5)
        if res.status_code != 200:
            return False, f"Status code {res.status_code}, response: {res.text}"
        data = res.json()
        if not data.get("success"):
            return False, f"success field is not true: {data}"
        return True, None
    test_step("Usunięcie projektu", t17)
    
    # Run all tests sequentially
    print("[INFO] Rozpoczynanie testów API...")
    passed_count = 0
    failed_count = 0
    
    for idx, (name, test_fn) in enumerate(tests, 1):
        try:
            ok, err_msg = test_fn()
            if ok:
                print(f"Test {idx} ({name}) OK")
                passed_count += 1
            else:
                print(f"Test {idx} ({name}) ERROR: {err_msg}")
                failed_count += 1
        except Exception as ex:
            print(f"Test {idx} ({name}) ERROR (wyjątek): {ex}")
            failed_count += 1
            
    print("\n" + "-"*40)
    print("PODSUMOWANIE TESTÓW API:")
    print(f"Wszystkie testy: {len(tests)}")
    print(f"Zaliczone: {passed_count}")
    print(f"Błędy: {failed_count}")
    if failed_count == 0:
        print("Wynik: SUKCES")
        success = True
    else:
        print("Wynik: PORAŻKA")
        success = False
    print("-"*40)
    
    return success

def main():
    print("Zależności Pythona sprawdzone.")
    print("Sprawdzanie dostępności backendu na porcie 8080...")
    
    started_by_us = False
    process = None
    
    if is_port_open(8080):
        try:
            requests.get("http://localhost:8080/api/students", timeout=1)
            print("[INFO] Backend jest już uruchomiony. Używanie istniejącej instancji...")
        except Exception:
            # Port is open but server didn't respond to HTTP request, let's close whatever is on 8080
            print("[WARNING] Port 8080 jest zajęty, ale nie odpowiada na zapytania HTTP. Zamykanie procesu...")
            kill_process_on_port(8080)
            time.sleep(1)
    
    if not is_port_open(8080):
        print("[INFO] Backend nie jest uruchomiony. Uruchamianie backendu za pomocą Gradle...")
        backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ZwinneBackEnd"))
        gradle_bat = os.path.join(backend_dir, "gradlew.bat")
        
        # Write to log file in the api_tests directory
        log_path = os.path.join(os.path.dirname(__file__), "backend_test.log")
        log_file = open(log_path, "w", encoding="utf-8")
        
        try:
            process = subprocess.Popen(
                [gradle_bat, "bootRun"],
                cwd=backend_dir,
                stdout=log_file,
                stderr=log_file,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
            )
            started_by_us = True
            
            # Wait for backend to spin up
            started = False
            for i in range(1, 91):
                time.sleep(1)
                if is_port_open(8080):
                    try:
                        requests.get("http://localhost:8080/api/students", timeout=1)
                        print(f"[INFO] Backend działa pomyślnie! (Uruchomienie zajęło ok. {i}s)")
                        started = True
                        break
                    except Exception:
                        pass
                if i % 10 == 0:
                    print(f"[INFO] Oczekiwanie na uruchomienie backendu... (próba {i}/90)")
            
            if not started:
                print("[ERROR] Limit czasu na uruchomienie backendu przekroczony. Sprawdź logi w 'api_tests/backend_test.log'")
                if process:
                    process.terminate()
                sys.exit(1)
                
        except Exception as e:
            print(f"[ERROR] Błąd podczas uruchamiania backendu: {e}")
            sys.exit(1)
            
    # Run tests
    test_success = False
    try:
        test_success = run_tests()
    finally:
        if started_by_us:
            print("[INFO] Zatrzymywanie procesu backendu...")
            kill_process_on_port(8080)
            if process:
                process.terminate()
            print("[INFO] Koniec działania skryptu.")
            
    if not test_success:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
