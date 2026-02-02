(() => {
  const navToggle = document.querySelector('.nav__toggle');
  const navList = document.querySelector('.nav__list');

  if (navToggle && navList) {
    navToggle.addEventListener('click', () => {
      const isOpen = navList.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  const targetDate = new Date('2026-05-01T00:00:00+08:00');
  const countdown = document.querySelector('[data-countdown]');

  const updateCountdown = () => {
    if (!countdown) return;
    const now = new Date();
    const diff = targetDate - now;
    const totalSeconds = Math.max(0, Math.floor(diff / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    countdown.querySelector('[data-days]').textContent = String(days).padStart(2, '0');
    countdown.querySelector('[data-hours]').textContent = String(hours).padStart(2, '0');
    countdown.querySelector('[data-minutes]').textContent = String(minutes).padStart(2, '0');
    countdown.querySelector('[data-seconds]').textContent = String(seconds).padStart(2, '0');
  };

  updateCountdown();
  setInterval(updateCountdown, 1000);

  const mapButton = document.querySelector('[data-map-link]');
  if (mapButton) {
    mapButton.addEventListener('click', () => {
      const url =
        'https://www.google.com/maps/dir/?api=1&destination=Manila%20Philippines%20Temple';
      window.open(url, '_blank', 'noopener');
    });
  }

  const audioToggle = document.querySelector('.audio-toggle');
  const audio = document.querySelector('.audio');

  const setAudioToggleState = (isPlaying) => {
    if (!audioToggle) return;
    audioToggle.setAttribute('aria-pressed', String(isPlaying));
    audioToggle.textContent = isPlaying
      ? 'Pause Reception Playlist'
      : 'Play Reception Playlist';
  };

  if (audio && audioToggle) {
    audioToggle.addEventListener('click', () => {
      if (audio.paused) {
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    });
  }

  if (audio) {
    audio.addEventListener('play', () => setAudioToggleState(true));
    audio.addEventListener('pause', () => setAudioToggleState(false));
    audio.addEventListener('ended', () => setAudioToggleState(false));

    const autoplayEvents = [
      ['wheel', window],
      ['scroll', window],
      ['touchstart', document],
    ];
    const passiveEvents = new Set(['scroll', 'wheel', 'touchstart']);
    let hasAutoplayAttempted = false;

    function removeAutoplayListeners() {
      autoplayEvents.forEach(([eventName, target]) => {
        target.removeEventListener(eventName, attemptAutoplay);
      });
    }

    function attemptAutoplay() {
      if (!audio.paused) {
        removeAutoplayListeners();
        return;
      }

      if (hasAutoplayAttempted) return;
      hasAutoplayAttempted = true;

      audio
        .play()
        .then(() => {
          removeAutoplayListeners();
        })
        .catch(() => {
          hasAutoplayAttempted = false;
        });
    }

    autoplayEvents.forEach(([eventName, target]) => {
      const options = passiveEvents.has(eventName) ? { passive: true } : undefined;
      target.addEventListener(eventName, attemptAutoplay, options);
    });
  }
})();
