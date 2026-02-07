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

  const initSupportModal = () => {
    const modal = document.querySelector('[data-support-modal]');
    const triggers = document.querySelectorAll('[data-support-trigger]');

    if (!modal || !triggers.length) return;

    const dialog = modal.querySelector('.support-modal__dialog');
    const titleEl = modal.querySelector('[data-support-modal-title]');
    const descriptionEl = modal.querySelector('[data-support-modal-description]');
    const qrSection = modal.querySelector('[data-support-modal-qr]');
    const qrImage = modal.querySelector('[data-support-modal-qr-image]');
    const qrLabel = modal.querySelector('[data-support-modal-qr-label]');
    const qrDownload = modal.querySelector('[data-support-modal-qr-download]');
    const numberField = modal.querySelector('[data-support-modal-number]');
    const numberLabel = modal.querySelector('[data-support-modal-number-label]');
    const numberValue = modal.querySelector('[data-support-modal-number-value]');
    const numberCopyButton = modal.querySelector('[data-copy-button="number"]');
    const linkField = modal.querySelector('[data-support-modal-link-field]');
    const linkAnchor = modal.querySelector('[data-support-modal-link]');
    const linkCopyButton = modal.querySelector('[data-copy-button="link"]');
    const feedbackEl = modal.querySelector('[data-copy-feedback]');
    const closeTargets = modal.querySelectorAll('[data-support-close]');
    let feedbackTimeoutId = null;
    let previousFocus = null;

    const resetFeedback = () => {
      if (!feedbackEl) return;
      feedbackEl.hidden = true;
      feedbackEl.textContent = '';
      if (feedbackTimeoutId) {
        clearTimeout(feedbackTimeoutId);
        feedbackTimeoutId = null;
      }
    };

    const showFeedback = (message) => {
      if (!feedbackEl) return;
      feedbackEl.hidden = false;
      feedbackEl.textContent = message;
      if (feedbackTimeoutId) {
        clearTimeout(feedbackTimeoutId);
      }
      feedbackTimeoutId = window.setTimeout(() => {
        resetFeedback();
      }, 2000);
    };

    const copyValue = async (value) => {
      if (!value) return;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(value);
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = value;
          textArea.setAttribute('readonly', '');
          textArea.style.position = 'absolute';
          textArea.style.left = '-9999px';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          textArea.remove();
        }
        showFeedback('Copied to clipboard');
      } catch (error) {
        showFeedback('Copy unavailable');
      }
    };

    modal.querySelectorAll('[data-copy-button]').forEach((button) => {
      button.addEventListener('click', () => {
        const value = button.getAttribute('data-copy-value');
        if (value) {
          copyValue(value);
        }
      });
    });

    const closeModal = () => {
      modal.classList.remove('is-visible');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.removeProperty('overflow');
      resetFeedback();
      if (previousFocus && typeof previousFocus.focus === 'function') {
        previousFocus.focus();
      }
    };

    closeTargets.forEach((target) => {
      target.addEventListener('click', closeModal);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('is-visible')) {
        closeModal();
      }
    });

    const openModal = (trigger) => {
      const {
        supportTitle,
        supportDescription,
        supportNumber,
        supportNumberLabel,
        supportLink,
        supportLinkText,
        supportQr,
        supportQrLabel,
      } = trigger.dataset;

      if (titleEl) {
        titleEl.textContent = supportTitle || 'Support details';
      }

      if (descriptionEl) {
        if (supportDescription) {
          descriptionEl.hidden = false;
          descriptionEl.textContent = supportDescription;
        } else {
          descriptionEl.hidden = true;
          descriptionEl.textContent = '';
        }
      }

      if (qrSection && qrImage) {
        if (supportQr) {
          qrSection.hidden = false;
          qrImage.onload = () => {
            qrSection.hidden = false;
          };
          qrImage.onerror = () => {
            qrSection.hidden = true;
          };
          qrImage.src = supportQr;
          qrImage.alt = supportTitle ? `${supportTitle} QR code` : 'Support QR code';
          if (qrLabel) {
            qrLabel.hidden = false;
            qrLabel.textContent = supportQrLabel || 'Scan to send';
          }
          if (qrDownload) {
            qrDownload.hidden = false;
            qrDownload.href = supportQr;
            const normalizedTitle = (supportTitle || 'support')
              .toLowerCase()
              .replace(/[^a-z0-9]+/gi, '-')
              .replace(/^-+|-+$/g, '');
            const extensionMatch = supportQr.split('.').pop();
            const extension = extensionMatch && extensionMatch.length < 8 ? extensionMatch : 'png';
            qrDownload.setAttribute('download', `${normalizedTitle || 'support'}-qr.${extension}`);
          }
        } else {
          qrSection.hidden = true;
          qrImage.removeAttribute('src');
          qrImage.alt = '';
          if (qrLabel) {
            qrLabel.hidden = true;
            qrLabel.textContent = '';
          }
          if (qrDownload) {
            qrDownload.hidden = true;
            qrDownload.removeAttribute('href');
            qrDownload.removeAttribute('download');
          }
        }
      }

      if (numberField && numberValue && numberLabel) {
        if (supportNumber) {
          numberField.hidden = false;
          numberValue.textContent = supportNumber;
          numberLabel.textContent = supportNumberLabel || 'Account number';
          if (numberCopyButton) {
            numberCopyButton.disabled = false;
            numberCopyButton.setAttribute('data-copy-value', supportNumber);
            numberCopyButton.setAttribute(
              'aria-label',
              `Copy ${supportTitle || 'support'} number`
            );
          }
        } else {
          numberField.hidden = true;
          numberValue.textContent = '';
          if (numberCopyButton) {
            numberCopyButton.disabled = true;
            numberCopyButton.setAttribute('data-copy-value', '');
          }
        }
      }

      if (linkField && linkAnchor) {
        if (supportLink) {
          linkField.hidden = false;
          linkAnchor.href = supportLink;
          linkAnchor.textContent = supportLinkText || supportLink;
          if (linkCopyButton) {
            linkCopyButton.disabled = false;
            linkCopyButton.setAttribute('data-copy-value', supportLink);
            linkCopyButton.setAttribute(
              'aria-label',
              `Copy ${supportTitle || 'support'} link`
            );
          }
        } else {
          linkField.hidden = true;
          linkAnchor.removeAttribute('href');
          linkAnchor.textContent = '';
          if (linkCopyButton) {
            linkCopyButton.disabled = true;
            linkCopyButton.setAttribute('data-copy-value', '');
          }
        }
      }

      previousFocus = document.activeElement;
      modal.classList.add('is-visible');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.setProperty('overflow', 'hidden');
      resetFeedback();
      if (dialog && typeof dialog.focus === 'function') {
        dialog.focus();
      }
    };

    triggers.forEach((trigger) => {
      trigger.addEventListener('click', () => {
        openModal(trigger);
      });
    });
  };

  initSupportModal();
})();
