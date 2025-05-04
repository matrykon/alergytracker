document.addEventListener('DOMContentLoaded', () => {
    const infoDiv = document.getElementById('info');
    const timeSpan = document.querySelector('.status-bar .time');
    let map; // Zmienna globalna dla mapy
    let userMarker; // Zmienna dla markera użytkownika

    // Ustawienie aktualnego czasu na pasku statusu
    function updateTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        if (timeSpan) {
            timeSpan.textContent = `${hours}:${minutes}`;
        }
    }
    updateTime();
    setInterval(updateTime, 30000); // Aktualizuj czas co 30 sekund

    // --- Inicjalizacja Mapy ---
    function initializeMap(lat, lon) {
        // Sprawdź, czy mapa już istnieje, jeśli tak, usuń ją
        if (map) {
            map.remove();
        }

        map = L.map('map').setView([lat, lon], 13); // Ustaw widok na podane koordynaty z zoomem 13

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Dodaj marker dla lokalizacji użytkownika z niestandardową ikoną i pulsującym okręgiem
        const userIcon = L.divIcon({
            className: 'user-marker-icon',
            iconSize: [12, 12]
        });

        const pulsingIcon = L.divIcon({
             className: 'pulsing-marker',
             iconSize: [40, 40]
        });

    
        // Dodaj główny marker użytkownika
        userMarker = L.marker([lat, lon], { icon: userIcon }).addTo(map);

        infoDiv.textContent = 'Pobieranie danych o jakości powietrza...';
        fetchAirQuality(lat, lon);
    }

    // --- Pobieranie Danych o Zanieczyszczeniu Powietrza ---
    function fetchAirQuality(lat, lon) {
        // !!! WAŻNE: Wstaw tutaj swój klucz API z OpenWeatherMap !!!
        const apiKey = '4977ab2b228203034413968034a0aa41';
        // !!! WAŻNE: Wstaw tutaj swój klucz API z OpenWeatherMap !!!


        const apiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Błąd API: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Dane API:", data); // Logowanie danych do konsoli
                if (data.list && data.list.length > 0) {
                    displayAirQualityData(data.list[0], lat, lon);
                } else {
                    displayError('Nie znaleziono danych o jakości powietrza dla tej lokalizacji.');
                    if (userMarker) {
                         userMarker.bindPopup(`<b>Twoja Lokalizacja</b><br>Szer: ${lat.toFixed(4)}<br>Dł: ${lon.toFixed(4)}<br><br><i>Brak danych o jakości powietrza.</i>`).openPopup();
                     }
                }
            })
            .catch(error => {
                console.error('Błąd podczas pobierania danych o jakości powietrza:', error);
                displayError(`Błąd: ${error.message}`);
                 if (userMarker) {
                     userMarker.bindPopup(`<b>Twoja Lokalizacja</b><br>Szer: ${lat.toFixed(4)}<br>Dł: ${lon.toFixed(4)}<br><br><i>Błąd pobierania danych.</i>`).openPopup();
                 }
            });
    }

    // --- Wyświetlanie Danych ---
    function displayAirQualityData(aqData, lat, lon) {
        const components = aqData.components;
        const aqi = aqData.main.aqi; // Air Quality Index (Indeks Jakości Powietrza)

        // Opis słowny AQI (według standardu europejskiego - przybliżony)
        let aqiText = '';
        switch (aqi) {
            case 1: aqiText = 'Bardzo dobra'; break;
            case 2: aqiText = 'Dobra'; break;
            case 3: aqiText = 'Umiarkowana'; break;
            case 4: aqiText = 'Zła'; break;
            case 5: aqiText = 'Bardzo zła'; break;
            default: aqiText = 'Nieznana';
        }

        // Aktualizacja paska informacyjnego na dole
        infoDiv.innerHTML = `
            <b>Jakość powietrza: ${aqiText} (AQI: ${aqi})</b><br>
            Kliknij marker po szczegóły.
        `;

        // Tworzenie treści dla popupu na mapie
        const popupContent = `
            <b>Jakość Powietrza (AQI: ${aqi} - ${aqiText})</b><br>
            <hr>
            <b>Składniki (μg/m³):</b><br>
            PM<sub>2.5</sub>: ${components.pm2_5?.toFixed(2) ?? 'N/A'}<br>
            PM<sub>10</sub>: ${components.pm10?.toFixed(2) ?? 'N/A'}<br>
            O<sub>3</sub> (Ozon): ${components.o3?.toFixed(2) ?? 'N/A'}<br>
            NO<sub>2</sub> (Dwutlenek azotu): ${components.no2?.toFixed(2) ?? 'N/A'}<br>
            SO<sub>2</sub> (Dwutlenek siarki): ${components.so2?.toFixed(2) ?? 'N/A'}<br>
            CO (Tlenek węgla): ${components.co ? (components.co / 1000).toFixed(2) + ' mg/m³' : 'N/A'}*<br>
            <hr>
            <small>Lokalizacja: ${lat.toFixed(4)}, ${lon.toFixed(4)}</small><br>
            <small>* Jednostka CO to mg/m³</small>
        `;

        // Dodanie popupu do markera użytkownika
        if (userMarker) {
            userMarker.bindPopup(popupContent).openPopup(); // Otwórz popup od razu
        }
    }

    // --- Obsługa Błędów ---
    function displayError(message) {
        infoDiv.textContent = message;
        infoDiv.style.backgroundColor = 'rgba(255, 100, 100, 0.8)'; // Czerwone tło dla błędu
    }

    // --- Nowa funkcja pokazująca prośbę o pozwolenie ---
    function showLocationPermissionRequest() {
        const permissionOverlay = document.createElement('div');
        permissionOverlay.className = 'permission-overlay';
        permissionOverlay.innerHTML = `
            <div class="permission-box">
                <h2>Dostęp do lokalizacji</h2>
                <p>Aplikacja wymaga dostępu do Twojej lokalizacji, aby pokazać jakość powietrza w Twoim obszarze.</p>
                <div class="permission-buttons">
                    <button id="denyLocation" class="btn btn-deny">Odmów</button>
                    <button id="allowLocation" class="btn btn-allow">Zezwól</button>
                </div>
            </div>
        `;
        
        document.querySelector('.content').appendChild(permissionOverlay);
        
        // Obsługa przycisków
        document.getElementById('allowLocation').addEventListener('click', () => {
            permissionOverlay.remove();
            requestGeolocation();
        });
        
        document.getElementById('denyLocation').addEventListener('click', () => {
            permissionOverlay.remove();
            handleLocationDenied();
        });
    }

    // --- Obsługa gdy użytkownik odmówi dostępu do lokalizacji ---
    function handleLocationDenied() {
        displayError("Odmówiono dostępu do lokalizacji. Wyświetlam domyślną lokalizację (Warszawa).");
        initializeMap(52.23, 21.01); // Warszawa jako domyślna
        if (userMarker) {
            userMarker.bindPopup(`<b>Domyślna lokalizacja (Warszawa)</b><br>Nie udało się pobrać Twojej lokalizacji.`).openPopup();
        }
    }

    // --- Funkcja żądająca geolokalizacji ---
    function requestGeolocation() {
        infoDiv.textContent = 'Pobieranie lokalizacji...';
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    console.log(`Lokalizacja uzyskana: ${lat}, ${lon}`);
                    initializeMap(lat, lon); // Inicjalizuj mapę PO uzyskaniu lokalizacji
                },
                (error) => {
                    console.error("Błąd geolokalizacji:", error);
                    let errorMsg = 'Nie udało się uzyskać lokalizacji. ';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMsg += "Odmówiono zgody na geolokalizację.";
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMsg += "Informacje o lokalizacji są niedostępne.";
                            break;
                        case error.TIMEOUT:
                            errorMsg += "Przekroczono czas oczekiwania na lokalizację.";
                            break;
                        case error.UNKNOWN_ERROR:
                            errorMsg += "Wystąpił nieznany błąd.";
                            break;
                    }
                    displayError(errorMsg);
                    // Ustaw domyślną lokalizację (np. centrum Polski), jeśli geolokalizacja zawiedzie
                    initializeMap(52.23, 21.01); // Warszawa jako domyślna
                    if (userMarker) {
                        userMarker.bindPopup(`<b>Domyślna lokalizacja (Warszawa)</b><br>Nie udało się pobrać Twojej lokalizacji.<br><i>${errorMsg}</i>`).openPopup();
                    }
                },
                { // Opcje geolokalizacji
                    enableHighAccuracy: true, // Dokładniejsza lokalizacja (może zużywać więcej baterii)
                    timeout: 10000,         // Maksymalny czas oczekiwania (10 sekund)
                    maximumAge: 0           // Wymuś świeży odczyt lokalizacji
                }
            );
        } else {
            displayError("Geolokalizacja nie jest wspierana przez tę przeglądarkę.");
            // Ustaw domyślną lokalizację
            initializeMap(52.23, 21.01); // Warszawa jako domyślna
            infoDiv.textContent = 'Geolokalizacja niedostępna. Wyświetlam mapę dla Warszawy.';
        }
    }

    // Rozpocznij proces od pokazania prośby o pozwolenie
    showLocationPermissionRequest();
});