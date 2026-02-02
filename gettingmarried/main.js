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
  const countdowns = document.querySelectorAll('[data-countdown]');

  const updateCountdown = () => {
    if (!countdowns.length) return;
    const now = new Date();
    const diff = targetDate - now;
    const totalSeconds = Math.max(0, Math.floor(diff / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    countdowns.forEach((container) => {
      const daysEl = container.querySelector('[data-days]');
      const hoursEl = container.querySelector('[data-hours]');
      const minutesEl = container.querySelector('[data-minutes]');
      const secondsEl = container.querySelector('[data-seconds]');

      if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

      daysEl.textContent = String(days).padStart(2, '0');
      hoursEl.textContent = String(hours).padStart(2, '0');
      minutesEl.textContent = String(minutes).padStart(2, '0');
      secondsEl.textContent = String(seconds).padStart(2, '0');
    });
  };

  updateCountdown();
  setInterval(updateCountdown, 1000);

  const mapButton = document.querySelector('[data-map-link]');
  if (mapButton) {
    mapButton.addEventListener('click', (event) => {
      if (event) event.preventDefault();
      const url =
        'https://www.google.com/maps/dir/?api=1&destination=Manila%20Philippines%20Temple';
      window.open(url, '_blank', 'noopener');
    });
  }

  const audioToggle = document.querySelector('.audio-toggle');
  const audio = document.querySelector('.audio');
  const musicPrompt = document.querySelector('.music-prompt');
  const musicPromptAccept = document.querySelector('[data-music-accept]');
  const musicPromptDecline = document.querySelector('[data-music-decline]');

  const setAudioToggleState = (isPlaying) => {
    if (!audioToggle) return;
    audioToggle.setAttribute('aria-pressed', String(isPlaying));
    audioToggle.textContent = isPlaying
      ? 'Pause Music'
      : 'Play Music';
  };

  if (audio) {
    audio.volume = 0.35;
  }

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
  }

  const hideMusicPrompt = () => {
    if (!musicPrompt) return;
    musicPrompt.classList.remove('is-visible');
    musicPrompt.setAttribute('aria-hidden', 'true');
  };

  if (musicPromptAccept) {
    musicPromptAccept.addEventListener('click', () => {
      hideMusicPrompt();
      if (audio && audio.paused) {
        audio.play().catch(() => {});
      }
    });
  }

  if (musicPromptDecline) {
    musicPromptDecline.addEventListener('click', () => {
      hideMusicPrompt();
      if (audio && !audio.paused) {
        audio.pause();
      }
    });
  }

  if (!audio) {
    hideMusicPrompt();
  }
})();
