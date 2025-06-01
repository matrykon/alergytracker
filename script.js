document.addEventListener('DOMContentLoaded', () => {
    const timeSpan = document.querySelector('.status-bar .time');
    const contentDiv = document.querySelector('.content');
    const phoneScreenDiv = document.querySelector('.phone-screen');

    // Elementy ekranów
    const profileSelectionScreen = document.getElementById('profileSelectionScreen');
    const createProfileScreen = document.getElementById('createProfileScreen');
    const mapScreen = document.getElementById('mapScreen');
    const profilePreviewScreen = document.getElementById('profilePreviewScreen');
    
    const existingProfilesListDiv = document.getElementById('existingProfilesList');
    const btnGoToCreateProfile = document.getElementById('btnGoToCreateProfile');
    const profileForm = document.getElementById('profileForm');
    const profileNameInput = document.getElementById('profileName');
    const btnBackToSelection = document.getElementById('btnBackToSelection');
    const btnBackToProfilesFromMap = document.getElementById('btnBackToProfilesFromMap'); // <-- NOWY PRZYCISK
    const btnShowMapFromPreview = document.getElementById('btnShowMapFromPreview');
    const btnBackToSelectionFromPreview = document.getElementById('btnBackToSelectionFromPreview');

    const infoDiv = document.getElementById('info');
    const mapContainer = document.getElementById('map');
    const profilePreviewData = document.getElementById('profilePreviewData');

    let map;
    let userMarker;
    let currentProfile = null;

    const PROFILES_STORAGE_KEY = 'airQualityAppProfiles';
    const ACTIVE_PROFILE_ID_KEY = 'airQualityActiveProfileId';

    function getProfilesFromStorage() {
        const profilesJson = localStorage.getItem(PROFILES_STORAGE_KEY);
        return profilesJson ? JSON.parse(profilesJson) : [];
    }

    function saveProfilesToStorage(profiles) {
        localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    }

    function setActiveProfileIdInStorage(profileId) {
        if (profileId) {
            localStorage.setItem(ACTIVE_PROFILE_ID_KEY, profileId);
        } else {
            localStorage.removeItem(ACTIVE_PROFILE_ID_KEY); // Usuń, jeśli null
        }
    }

    function getActiveProfileIdFromStorage() {
        return localStorage.getItem(ACTIVE_PROFILE_ID_KEY);
    }

    function saveNewProfile(name) {
        const profiles = getProfilesFromStorage();
        const newProfile = {
            id: Date.now().toString(),
            name: name,
            location: null
        };
        profiles.push(newProfile);
        saveProfilesToStorage(profiles);
        return newProfile;
    }

    function updateProfileLocation(profileId, lat, lon) {
        const profiles = getProfilesFromStorage();
        const profileIndex = profiles.findIndex(p => p.id === profileId);
        if (profileIndex !== -1) {
            profiles[profileIndex].location = { lat, lon };
            saveProfilesToStorage(profiles);
            if (currentProfile && currentProfile.id === profileId) {
                currentProfile.location = { lat, lon };
            }
        }
    }

    // --- Przełączanie Ekranów ---
    function showScreen(screenElement) {
        profileSelectionScreen.style.display = 'none';
        createProfileScreen.style.display = 'none';
        mapScreen.style.display = 'none';
        profilePreviewScreen.style.display = 'none';
        
        // Domyślnie ukryj przycisk powrotu z mapy
        btnBackToProfilesFromMap.style.display = 'none';

        if (screenElement) {
            screenElement.style.display = 'flex';
            if (screenElement === mapScreen) {
                // Pokaż przycisk "Wybierz Inny Profil" tylko na ekranie mapy
                // i tylko jeśli są jakiekolwiek profile do wyboru
                const profiles = getProfilesFromStorage();
                if (profiles.length > 0) { // Pokaż tylko jeśli jest do czego wracać
                     btnBackToProfilesFromMap.style.display = 'block';
                }
            }
        }
    }

    function displayProfileSelectionScreen() {
        const profiles = getProfilesFromStorage();
        existingProfilesListDiv.innerHTML = ''; 

        if (profiles.length > 0) {
            profiles.forEach(profile => {
                const button = document.createElement('button');
                button.classList.add('profile-button');
                button.textContent = profile.name;
                button.onclick = () => {
                    currentProfile = profile;
                    setActiveProfileIdInStorage(profile.id);
                    displayProfilePreviewScreen(profile);
                };
                existingProfilesListDiv.appendChild(button);
            });
        } else {
            existingProfilesListDiv.innerHTML = '<p>Brak zapisanych profili. Utwórz nowy.</p>';
            // Jeśli nie ma profili, od razu przejdź do tworzenia nowego
            // To zapobiega pustemu ekranowi wyboru
            setTimeout(displayCreateProfileScreen, 0); // setTimeout aby uniknąć problemów z renderowaniem
            return; // Zakończ, bo przechodzimy do innego ekranu
        }
        showScreen(profileSelectionScreen);
    }

    function displayCreateProfileScreen() {
        profileNameInput.value = '';
        const profiles = getProfilesFromStorage();
        if (profiles.length > 0) {
            btnBackToSelection.style.display = 'block';
        } else {
            btnBackToSelection.style.display = 'none';
        }
        showScreen(createProfileScreen);
    }

    function navigateToMapScreen() {
        showScreen(mapScreen); // To teraz ustawi widoczność btnBackToProfilesFromMap
        if (currentProfile && currentProfile.location) {
            initializeMap(currentProfile.location.lat, currentProfile.location.lon);
        } else {
            infoDiv.textContent = 'Wybierz lokalizację dla profilu: ' + (currentProfile ? currentProfile.name : 'Nowy Profil');
            showLocationPermissionRequest();
        }
    }

    // --- Inicjalizacja Mapy i Geolokalizacja ---
    function initializeMap(lat, lon) {
        try {
            if (map) {
                map.remove();
                map = null; // Ważne, aby można było ją poprawnie reinicjalizować
            }
            map = L.map(mapContainer).setView([lat, lon], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            const userIcon = L.divIcon({
                className: 'user-marker-icon',
                iconSize: [12, 12]
            });
            userMarker = L.marker([lat, lon], { icon: userIcon }).addTo(map);

            infoDiv.textContent = 'Pobieranie danych o jakości powietrza...';
            fetchAirQuality(lat, lon);

            if (currentProfile) {
                updateProfileLocation(currentProfile.id, lat, lon);
            }

        } catch (error) {
            console.error('Błąd podczas inicjalizacji mapy:', error);
            displayError('Wystąpił błąd podczas inicjalizacji mapy.');
        }
    }

    // ... (reszta funkcji fetchAirQuality, displayAirQualityData, showLocationPermissionRequest, requestGeolocation, handleLocationDenied, displayError, updateTime bez zmian) ...
    function fetchAirQuality(lat, lon) {
        const apiKey = '4977ab2b228203034413968034a0aa41'; // Klucz API
        const apiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

        fetch(apiUrl)
            .then(response => {
                if (!response.ok) throw new Error(`Błąd API: ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (!data || !data.list || data.list.length === 0) throw new Error('Nieprawidłowa odpowiedź z API');
                displayAirQualityData(data.list[0], lat, lon);
            })
            .catch(error => {
                console.error('Błąd pobierania danych o jakości powietrza:', error);
                displayError(`Błąd: ${error.message}`);
                if (userMarker) {
                    userMarker.bindPopup(`<b>Twoja Lokalizacja</b><br>Szer: ${lat.toFixed(4)}<br>Dł: ${lon.toFixed(4)}<br><br><i>Błąd pobierania danych.</i>`).openPopup();
                }
            });
    }

    function displayAirQualityData(aqData, lat, lon) {
        const components = aqData.components;
        const aqi = aqData.main.aqi;
        let aqiText = '';
        switch (aqi) {
            case 1: aqiText = 'Bardzo dobra'; break;
            case 2: aqiText = 'Dobra'; break;
            case 3: aqiText = 'Umiarkowana'; break;
            case 4: aqiText = 'Zła'; break;
            case 5: aqiText = 'Bardzo zła'; break;
            default: aqiText = 'Nieznana';
        }

        infoDiv.innerHTML = `<b>Jakość powietrza: ${aqiText} (AQI: ${aqi})</b><br>Kliknij marker po szczegóły.`;

        const popupContent = `
            <b>Jakość Powietrza (AQI: ${aqi} - ${aqiText})</b><hr>
            <b>Składniki (μg/m³):</b><br>
            PM<sub>2.5</sub>: ${components.pm2_5?.toFixed(2) ?? 'N/A'}<br>
            PM<sub>10</sub>: ${components.pm10?.toFixed(2) ?? 'N/A'}<br>
            O<sub>3</sub>: ${components.o3?.toFixed(2) ?? 'N/A'}<br>
            NO<sub>2</sub>: ${components.no2?.toFixed(2) ?? 'N/A'}<br>
            SO<sub>2</sub>: ${components.so2?.toFixed(2) ?? 'N/A'}<br>
            CO: ${components.co ? (components.co / 1000).toFixed(2) + ' mg/m³' : 'N/A'}*<hr>
            <small>Lokalizacja: ${lat.toFixed(4)}, ${lon.toFixed(4)}</small><br>
            <small>* Jednostka CO to mg/m³</small>`;
        
        if (userMarker) {
            userMarker.bindPopup(popupContent).openPopup();
        }
    }
    
    function showLocationPermissionRequest() {
        const existingOverlay = document.querySelector('.permission-overlay');
        if (existingOverlay) existingOverlay.remove();

        const permissionOverlay = document.createElement('div');
        permissionOverlay.className = 'permission-overlay';
        permissionOverlay.innerHTML = `
            <div class="permission-box">
                <h2>Dostęp do lokalizacji</h2>
                <p>Aplikacja wymaga dostępu do Twojej lokalizacji, aby pokazać jakość powietrza.</p>
                <div class="permission-buttons">
                    <button id="denyLocation" class="btn btn-deny">Odmów</button>
                    <button id="allowLocation" class="btn btn-allow">Zezwól</button>
                </div>
            </div>`;
        
        phoneScreenDiv.appendChild(permissionOverlay);
        
        document.getElementById('allowLocation').addEventListener('click', () => {
            permissionOverlay.remove();
            requestGeolocation();
        });
        
        document.getElementById('denyLocation').addEventListener('click', () => {
            permissionOverlay.remove();
            handleLocationDenied();
        });
    }

    function requestGeolocation() {
        infoDiv.textContent = 'Pobieranie lokalizacji...';
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    initializeMap(lat, lon);
                },
                (error) => {
                    console.error("Błąd geolokalizacji:", error);
                    let errorMsg = 'Nie udało się uzyskać lokalizacji. ';
                     switch(error.code) {
                        case error.PERMISSION_DENIED: errorMsg += "Odmówiono zgody."; break;
                        case error.POSITION_UNAVAILABLE: errorMsg += "Lokalizacja niedostępna."; break;
                        case error.TIMEOUT: errorMsg += "Przekroczono czas."; break;
                        default: errorMsg += "Nieznany błąd."; break;
                    }
                    displayError(errorMsg + " Używam domyślnej lokalizacji (Warszawa).");
                    initializeMap(52.23, 21.01); 
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            displayError("Geolokalizacja nie jest wspierana. Używam domyślnej lokalizacji (Warszawa).");
            initializeMap(52.23, 21.01);
        }
    }
    
    function handleLocationDenied() {
        displayError("Odmówiono dostępu do lokalizacji. Wyświetlam domyślną lokalizację (Warszawa).");
        initializeMap(52.23, 21.01);
        if (userMarker) {
             userMarker.bindPopup(`<b>Domyślna lokalizacja (Warszawa)</b><br>Nie udało się pobrać Twojej lokalizacji.`).openPopup();
        }
    }

    function displayError(message) {
        if (infoDiv) {
            infoDiv.textContent = message;
            infoDiv.style.backgroundColor = 'rgba(255, 100, 100, 0.8)';
        }
    }

    function updateTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        if (timeSpan) timeSpan.textContent = `${hours}:${minutes}`;
    }

    // --- Inicjalizacja Aplikacji ---
    function appInit() {
        updateTime();
        setInterval(updateTime, 30000);

        btnGoToCreateProfile.addEventListener('click', displayCreateProfileScreen);
        btnBackToSelection.addEventListener('click', displayProfileSelectionScreen);

        // NOWY Event Listener dla przycisku powrotu z mapy
        btnBackToProfilesFromMap.addEventListener('click', () => {
            if (map) {
                map.remove(); // Usuń instancję mapy
                map = null;   // Wyzeruj zmienną mapy, aby mogła być poprawnie utworzona ponownie
            }
            currentProfile = null; // Wyzeruj aktualny profil
            setActiveProfileIdInStorage(null); // Usuń aktywny profil z localStorage
            displayProfileSelectionScreen(); // Pokaż ekran wyboru profili
        });

        btnBackToSelectionFromPreview.addEventListener('click', () => {
            displayProfileSelectionScreen();
        });

        btnShowMapFromPreview.addEventListener('click', () => {
            navigateToMapScreen();
        });

        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('profileName').value.trim();
            const firstName = document.getElementById('profileFirstName').value.trim();
            const age = document.getElementById('profileAge').value.trim();

            // Pobierz wybrane alergeny
            const allergenCheckboxes = document.querySelectorAll('#allergenCheckboxes input[type="checkbox"]:checked');
            const allergens = Array.from(allergenCheckboxes).map(cb => cb.value);

            // Powiadomienia
            const notifications = document.getElementById('profileNotifications').checked;
            const notifyType = document.getElementById('profileNotifyType').value;

            if (!name) {
                alert('Podaj nazwę profilu!');
                return;
            }

            // Tworzenie nowego profilu z dodatkowymi danymi
            const profiles = getProfilesFromStorage();
            const newProfile = {
                id: Date.now().toString(),
                name: name,
                firstName: firstName || null,
                age: age ? parseInt(age) : null,
                allergens: allergens,
                notifications: notifications,
                notifyType: notifyType,
                location: null
            };
            profiles.push(newProfile);
            saveProfilesToStorage(profiles);
            setActiveProfileIdInStorage(newProfile.id);
            currentProfile = newProfile;
            navigateToMapScreen();
        });

        const profiles = getProfilesFromStorage();
        const activeId = getActiveProfileIdFromStorage();
        
        if (activeId) {
            const foundProfile = profiles.find(p => p.id === activeId);
            if (foundProfile) {
                currentProfile = foundProfile;
                navigateToMapScreen();
                return;
            } else {
                // Jeśli aktywny ID jest w storage, ale nie ma takiego profilu (np. usunięty ręcznie)
                setActiveProfileIdInStorage(null); // Wyczyść nieprawidłowy ID
            }
        }
        
        // Jeśli nie było aktywnego profilu, lub był nieprawidłowy
        displayProfileSelectionScreen(); // Domyślnie zaczynamy od wyboru profilu
                                         // displayProfileSelectionScreen samo zdecyduje, czy pokazać listę,
                                         // czy przekierować do tworzenia, jeśli lista jest pusta.
    }

    appInit();

    function displayProfilePreviewScreen(profile) {
        // Tworzenie czytelnego podglądu
        profilePreviewData.innerHTML = `
            <b>Nazwa profilu:</b> ${profile.name}<br>
            <b>Imię:</b> ${profile.firstName ? profile.firstName : '-'}<br>
            <b>Wiek:</b> ${profile.age ? profile.age : '-'}<br>
            <b>Alergeny:</b> ${profile.allergens && profile.allergens.length ? profile.allergens.join(', ') : '-'}<br>
            <b>Powiadomienia:</b> ${profile.notifications ? 'Tak' : 'Nie'}<br>
            <b>Typ powiadomień:</b> ${profile.notifyType === 'push' ? 'Aplikacja' : profile.notifyType === 'email' ? 'E-mail' : profile.notifyType === 'sms' ? 'SMS' : '-'}
        `;
        showScreen(profilePreviewScreen);
    }
});