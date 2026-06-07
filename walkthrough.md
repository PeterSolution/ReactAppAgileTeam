# Podsumowanie Implementacji (Walkthrough)

Z powodzeniem zaimplementowano i zintegrowano pełną architekturę systemu zarządzania projektami studenckimi. Wszystkie wymagania z pliku [readme.md](file:///home/teapocik/Documents/PBS/Progzwinne/readme.md) zostały spełnione, a automatyczne testy integracyjne oraz jednostkowe zakończyły się pełnym sukcesem.

---

## Co Zostało Wykonane

### 1. Spring Boot Backend ([ZwinneBackEnd](file:///home/teapocik/Documents/PBS/Progzwinne/ZwinneBackEnd))
- **Model Danych & Repozytoria**: Stworzono encje JPA dla użytkowników, projektów, zadań, plików i wiadomości czatu wraz z kompletnym warstwowym mapowaniem.
- **Bezpieczeństwo (JWT)**: Zintegrowano Spring Security z autoryzacją bezstanową za pomocą Access Tokenów i Refresh Tokenów (z rotacją tokenów w bazie danych) oraz podziałem ról na `ROLE_STUDENT` i `ROLE_PROWADZACY`.
- **Zapis Plików**: Stworzono serwis `FileStorageService` zapisujący pliki na dysku serwera w zabezpieczony przed Directory Traversal sposób i powiązujący metadane w PostgreSQL.
- **Komunikacja w czasie rzeczywistym**: Skonfigurowano WebSocket (broker STOMP) z autoryzacją JWT w kanale przychodzącym (`CONNECT`) do przesyłania wiadomości w czasie rzeczywistym.
- **Logowanie**: Skonfigurowano plik `logback-spring.xml` ze SLF4J, realizujący logowanie do konsoli oraz rotacyjnych plików dziennika w katalogu `./logs`.

### 2. Integracja React Frontend ([ZwinneFrontEnd](file:///home/teapocik/Documents/PBS/Progzwinne/ReactAppAgileTeam/ZwinneFrontEnd))
- **Uwierzytelnianie (fetchWithAuth)**: Stworzono funkcję pomocniczą automatycznie dołączającą token JWT Bearer do zapytań HTTP i realizującą automatyczne odświeżanie Access Tokena przy statusie 401 przy użyciu Refresh Tokena.
- **Logowanie i Rejestracja**: Zintegrowano formularze z nowym API, dodając walidację, obsługę błędów z serwera oraz klucz rejestracji dla wykładowców.
- **Widok Projektów**: Zaimplementowano wyszukiwanie w czasie rzeczywistym (debounce) oraz paginację ze stronicowaniem po stronie serwera. Ukryto przyciski CRUD (dodawanie/edycja/usuwanie) dla studentów.
- **Tablica Kanban (TasksPage)**: Utworzono nową podstronę tablicy Scrum dla zadań w projekcie (kolumny TODO, IN PROGRESS, DONE) z obsługą zmiany statusu, przypisywaniem studentów, a także panelem załączników oraz zintegrowanym czatem grupowym WebSocket.
- **Czat Ogólny**: Utworzono nową podstronę czatu globalnego na WebSocket STOMP.
- **Zarządzanie Studentami**: Dodano możliwość przypisywania studentów do projektów przez prowadzącego.

### 3. Konteneryzacja & Docker
- Utworzono plik [docker-compose.yml](file:///home/teapocik/Documents/PBS/Progzwinne/docker-compose.yml) w głównym katalogu.
- Stworzono zoptymalizowane pliki `Dockerfile` dla backendu oraz frontendu (z Nginx do serwowania aplikacji SPA bez błędów 404 przy odświeżaniu stron).

---

## Wyniki Testów

Testy automatyczne zostały uruchomione lokalnie z profilu testowego z bazą H2 w pamięci i zakończyły się **pełnym sukcesem** (wszystkie testy zielone):
```
Path for java installation '/usr/lib/jvm/openjdk-17' (Common Linux Locations) does not contain a java executable
> Task :compileJava UP-TO-DATE
> Task :processResources UP-TO-DATE
> Task :classes UP-TO-DATE
> Task :compileTestJava UP-TO-DATE
> Task :processTestResources
> Task :testClasses
> Task :test

BUILD SUCCESSFUL in 10s
5 actionable tasks: 2 executed, 3 up-to-date
```
Przetestowano m.in. bezpieczną rejestrację studentów i prowadzących, uwierzytelnianie tokenami JWT oraz filtrowanie projektów w zależności od posiadanych ról.

---

## Instrukcja Uruchomienia Aplikacji

### Sposób A: Za pomocą Docker Compose (Zalecany)
Wymaga zainstalowanego Dockera oraz docker-compose na maszynie docelowej.
W głównym katalogu wykonaj:
```bash
docker-compose up --build
```
Aplikacja frontendowa będzie dostępna pod adresem: `http://localhost:3000`  
Backend będzie nasłuchiwał pod adresem: `http://localhost:8080`

### Sposób B: Uruchomienie lokalne (bez Dockera)
1. **Baza Danych**: Upewnij się, że masz uruchomioną bazę PostgreSQL na porcie 5432 o nazwie `zwinne_db` z użytkownikiem `postgres/postgres`.
2. **Uruchomienie Backend**:
   Przejdź do katalogu `ZwinneBackEnd` i uruchom:
   ```bash
   ./gradlew bootRun
   ```
3. **Uruchomienie Frontend**:
   Przejdź do katalogu `ReactAppAgileTeam/ZwinneFrontEnd` i uruchom:
   ```bash
   npm run dev
   ```
   Frontend otworzy się pod adresem deweloperskim (zazwyczaj `http://localhost:5173`).
