Celem projektu jest stworzenie aplikacji webowej do zarządzania projektami dla studentów. Wykorzystywany w projekcie będzie framework Spring Boot i narzędzie Gradle. Oprogramowanie zostanie rozdzielone na back-end i front-end, będzie korzystać z REST API i RestClienta. Część Front-endu została wykonana w React + TypeScript + Vite. Ponadto oprogramowanie będzie testowane za pomocą bibliotek JUnit, MockMVC i Mockito. Aplikacja zostanie też zabezpieczona przy użyciu modułu Spring Security, początkowo za pomocą podstawowego uwierzytelniania, a później tokenów dostępowych i odświeżania. Utworzona aplikacja powinna umożliwiać wyświetlanie listy wszystkich projektów przechowywanych w bazie danych, a także ich tworzenie, modyfikowanie i usuwanie. Trzeba również zapewnić możliwość przeglądania zadań wybranego projektu, a także przypisywania do niego nowych pozycji. Poza tym należy uwzględnić przypisywanie użytkowników aplikacji do poszczególnych projektów, opcjonalnie również do zadań. Utworzony graficzny interfejs użytkownika powinien umożliwiać stronicowanie danych oraz posiadać mechanizm wyszukiwania i filtrowania.

Realizacja powinna uwzględniać m.in.:
• zabezpieczenie danych i aplikacji przed nieupoważnionym dostępem,
• odrębne uprawnienia dla prowadzącego i studentów,
• testy jednostkowe, integracyjne i akceptacyjne (koniecznie serwisów i kontrolerów, zalecane JUnit5, Mockito i MockMVC),
• pełną funkcjonalność systemu pozwalającą dodawać, modyfikować i usuwać dane projektów, zadań i studentów. Powinna istnieć możliwość stronicowania i wyszukiwania, opcjonalnie sortowania, danych projektów i studentów.
• możliwość przesyłania na serwer i pobierania plików przypisywanych do danego projektu lub zadania,
• ogólnodostępny chat korzystający z dwukierunkowego kanału websocketowego (można przy tym użyć frameworku Atmosphere lub skorzystać ze Springa tworząc kanał websocketowy z wykorzystaniem protokołu STOMP). Dla chętnych funkcjonalność komunikacji w obrębie grupy projektowej i możliwość przesyłania plików do wybranych użytkowników,
• aplikacja powinna używać mechanizmu rejestracji np. biblioteki Logback i rozwiązania SLF4J w roli abstrakcyjnej fasady.
Kolejne zadania i technologie do rozważenia:
• budowa obrazu Dockera i uruchamianie aplikacji w kontenerze,
• rozbudowa projektu o środowisko monitorowania i wizualizacji pracy aplikacji webowej opartej na frameworku Spring Boot (z wykorzystaniem narzędzi Prometheus oraz Grafana),
• wykorzystanie OAuth 2.0 - standardowego protokołu autoryzacji dostępu (logowanie za pomocą np. Google’a czy Facebooka),
• aplikacja reaktywna z użyciem Spring WebFlux (R2DBC - Reactive Relational Database Connectivity, Reactive Transactions, Backpressure, RSocket) lub korzystająca z wątków wirtualnych (wymagana Java 21 lub nowsza),
• implementacja tablicy scrumowej,
• implementacja tablicy kanbanowej z ustawianymi limitami prac w każdej kolumnie, a także skumulowanego wykresu przepływu z nanoszonymi liniami trendu dla tempa przybywania i liczby elementów w systemie,
• aplikacja springowa z wykorzystaniem programowania funkcyjnego zastępującego większość adnotacji,
• GraphQL z użyciem Spring Boota.
Trzeba będzie definiować m.in.:
    - tzw. Input czyli prostą klasę (POJO) dla przyjmowania danych z edycji w GraphQL,
    - QueryResolver, klasę obsługująca zapytania w GraphQL,
    - MutationResolver, klasę obsługująca modyfikacje w GraphQL,
    - plik schema dla GraphQL, opisujący strukturę bazy danych i dostępne metody,
• Elasticsearch w Spring Boot,
• SOAP (ang. Simple Object Access Protocol) - usługa opisywana przez udostępniany plik WSDL (nazwa operacji, jej dane wejściowe, ich typ itp.) zabezpieczona za pomocą SAML-a (ang. Security Assertion Markup Language),
• mechanizm bazodanowych triggerów do automatycznego archiwizowania zmian projektu i jego zadań,
• utworzenie Springowej aplikacji natywnej przy użyciu kompilatora GraalVM.