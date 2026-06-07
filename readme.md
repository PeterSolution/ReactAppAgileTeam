## 🔧 Ogólne przygotowanie – aktualizacja systemu

Zalecam rozpocząć od aktualizacji listy pakietów i systemu:

```bash
sudo apt update
sudo apt upgrade -y
```

---

## 🐳 Sposób A: Uruchomienie przez Docker Compose (zalecany)

### 1. Zainstaluj Dockera

```bash
# Zainstaluj pakiety umożliwiające dodanie repozytorium przez HTTPS
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Dodaj oficjalny klucz GPG Dockera
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Dodaj repozytorium stabilne
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Zainstaluj silnik Dockera
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io
```

### 2. Dodaj swojego użytkownika do grupy `docker` (aby uniknąć `sudo` przy każdym poleceniu)

```bash
sudo usermod -aG docker $USER
newgrp docker   # lub wyloguj się i zaloguj ponownie
```

### 3. Zainstaluj Docker Compose (wtyczka)

Nowoczesne wersje Dockera zawierają komendę `docker compose` (z myślnikiem) jako wtyczkę. Sprawdź:

```bash
docker compose version
```

Jeśli nie jest dostępna, zainstaluj ją:

```bash
sudo apt install -y docker-compose-plugin
```

Lub klasyczny `docker-compose` (niezalecany, ale działa):

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 4. Uruchom aplikację

W głównym katalogu projektu (z plikiem `docker-compose.yml`):

```bash
docker compose up --build
```

Aplikacja będzie dostępna pod:
- Frontend: http://localhost:3000
- Backend: http://localhost:8080

Aby zatrzymać: `Ctrl + C`, a następnie `docker compose down`.

---

## 🖥️ Sposób B: Uruchomienie lokalne (bez Dockera)

### 1. Zainstaluj PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Skonfiguruj bazę danych:

```bash
sudo -u postgres psql
```

W konsoli `psql` wykonaj:

```sql
CREATE DATABASE zwinne_db;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE zwinne_db TO postgres;
\q
```

Upewnij się, że PostgreSQL nasłuchuje na porcie 5432 (domyślnie). Jeśli potrzebujesz połączenia z `localhost`, standardowa konfiguracja działa od razu.

### 2. Zainstaluj JDK (do uruchomienia backendu w Gradle)

Projekt używa Gradle Wrapper (`./gradlew`), więc potrzebujesz tylko JDK 17 lub nowszej:

```bash
sudo apt install -y openjdk-17-jdk
java -version   # sprawdzenie
```

### 3. Uruchom backend

Przejdź do katalogu `ZwinneBackEnd` i uruchom:

```bash
cd ZwinneBackEnd
./gradlew bootRun
```

> Jeśli plik `gradlew` nie ma praw wykonywania: `chmod +x gradlew`

Backend wystartuje domyślnie na porcie 8080.

### 4. Zainstaluj Node.js i npm (dla frontendu)

```bash
# Dodaj oficjalne repozytorium NodeSource (zalecane dla nowszych wersji)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Sprawdź wersje
node --version
npm --version
```

### 5. Uruchom frontend

Przejdź do katalogu `ReactAppAgileTeam/ZwinneFrontEnd`:

```bash
cd ../ReactAppAgileTeam/ZwinneFrontEnd   # lub pełna ścieżka
npm install   # instaluje zależności (tylko za pierwszym razem)
npm run dev
```

Frontend uruchomi się na porcie deweloperskim Vite – zazwyczaj http://localhost:5173.

---

## ✅ Podsumowanie

| Metoda | Zalety | Wymagania |
|--------|--------|------------|
| **Docker** | Izolacja, łatwość, brak konfliktów wersji | Docker + Docker Compose |
| **Lokalna** | Bezpośredni dostęp do kodu, szybszy restart w trakcie rozwoju | PostgreSQL, JDK, Node.js |

Jeśli napotkasz problemy (np. port zajęty, brak połączenia z bazą), sprawdź:
- Czy PostgreSQL działa: `sudo systemctl status postgresql`
- Czy backend widzi bazę: sprawdź logi Gradle
- Czy frontend ma poprawny adres backendu (zwykle w pliku `.env` lub `vite.config.js`)

Jeśli potrzebujesz pomocy przy konfiguracji szczegółów (np. zmiany hasła bazy danych, dostosowania portów), daj znać – pomogę doprecyzować.
