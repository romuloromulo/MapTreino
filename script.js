'use strict';

// prettier-ignore

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,longitude]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }
  _setDescription(){
//prettier-ignore
const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
this.description = `${this.type ==='running'? 'Corrida' : 'Ciclismo'} em ${this.date.getDate()} de ${months[this.date.getMonth()]} `
  }

  click(){ 
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    //km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycle1 = new Cycling([39, -12], 5.2, 24, 178);
// console.log(run1, cycle1);

////////////////////////////////////////////////
/// APP ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const resetBtn = document.querySelector('.btn-reset');
const closeBtn = document.querySelector('.close');
const side = document.querySelector('.sidebar');
const sortBtn = document.querySelector('.sort');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  sorted = false;
  constructor() {
    // Get users position
    this._getPosition();
    // Get data from local storage
    this._getLocalStore();

    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    resetBtn.addEventListener('click', this.reset.bind(this));
    containerWorkouts.addEventListener('click', this._closeWorkout.bind(this));

    sortBtn.addEventListener('click', this._sortWorkout.bind(this));
  }
  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get yout position');
        }
      );
  }

  _loadMap(position, sort = false) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    // console.log(map);

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }
    ).addTo(this.#map);

    // handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => this._renderWorkoutMarker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hiddenForm() {
    //empty inputs
    inputDistance.value =
      inputDuration.value =
      inputElevation.value =
      inputCadence.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;

    let workout;
    // Check if data is valid

    // If workout running, creat running objcet
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout is cycling, creat cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);
    console.log(workout);

    /// Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // hide form + clear input fields

    this._hiddenForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <div class="close"  data-id="${
      workout.id
    }"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
</div>  
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    
    <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          `;

    if (workout.type === 'running')
      html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">1${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>`;
    if (workout.type === 'cycling')
      html += ` <div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.speed.toFixed(1)}</span>
    <span class="workout__unit">km/h</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">⛰</span>
    <span class="workout__value">${workout.elevationGain}</span>
    <span class="workout__unit">m</span>
  </div>
</li>`;

    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    // console.log(workoutEl);
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      Animation: true,
      pan: { duration: 1 },
    });
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workout', JSON.stringify(this.#workouts));
  }

  _getLocalStore() {
    const data = JSON.parse(localStorage.getItem('workout'));
    // console.log(data[0]);

    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => this._renderWorkout(work));
  }

  reset() {
    localStorage.removeItem('workout');
    location.reload();
  }
  _sortWorkout() {
    const data = this.#workouts;
    const copyData = [...data];
    const sorted1 = copyData.sort((a, b) => a.distance - b.distance);

    if (!this.sorted) {
      // localStorage.removeItem('workout');

      localStorage.setItem('workout', JSON.stringify(sorted1));
    } else {
      // localStorage.removeItem('workout');
      localStorage.setItem('workout', JSON.stringify(copyData));
    }

    this.sorted = !this.sorted;
    console.log(this.sorted);
    console.log(sorted1);
    console.log(this.#workouts);
    console.log(copyData);
    // location.reload();
  }
  _closeWorkout(e) {
    const close = e.target.closest('.close');
    const data = JSON.parse(localStorage.getItem('workout'));
    if (!close) return;
    // console.log(close.dataset.id);
    // console.log(data);
    const closed = data.filter(i => i.id !== close.dataset.id);
    localStorage.setItem('workout', JSON.stringify(closed));
    location.reload();
    // if (closed.length  1) localStorage.removeItem('workout');

    // localStorage.setItem('workout', JSON.stringify(closed));
    // location.reload();
    // console.log(localStorage.getItem('workout'));
    // console.log(close[0]);
  }
}

const app = new App();

// console.log(localStorage.getItem(1));
