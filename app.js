(function () {
  "use strict";

  var DEFAULT_TAB = "projects";
  var TAB_IDS = ["projects", "resume", "experience", "contact"];
  var REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");

  var tabs = Array.from(document.querySelectorAll('[role="tab"][data-tab]'));
  var panels = Array.from(document.querySelectorAll('[role="tabpanel"]'));
  var logoButton = document.getElementById("homeLogo");

  function isValidTab(tabId) {
    return TAB_IDS.indexOf(tabId) !== -1;
  }

  function getTabIdFromHash(hash) {
    var parsed = (hash || "").replace(/^#/, "").trim().toLowerCase();
    return isValidTab(parsed) ? parsed : null;
  }

  function setHash(tabId, replace) {
    var nextHash = "#" + tabId;
    if (replace) {
      try {
        history.replaceState(null, "", nextHash);
      } catch (error) {
        window.location.hash = nextHash;
      }
      return;
    }
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }

  function animatePanel(panel) {
    if (REDUCED_MOTION.matches) {
      return;
    }
    panel.classList.add("is-entering");
    panel.getBoundingClientRect();
    panel.classList.remove("is-entering");
  }

  function activateTab(tabId, options) {
    var opts = options || {};
    var shouldUpdateHash = Boolean(opts.updateHash);
    var shouldAnimate = opts.animate !== false;
    var shouldFocus = Boolean(opts.focus);

    tabs.forEach(function (tab) {
      var selected = tab.dataset.tab === tabId;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
      if (selected && shouldFocus) {
        tab.focus({ preventScroll: true });
      }
    });

    panels.forEach(function (panel) {
      var active = panel.id === tabId;
      panel.hidden = !active;
      panel.setAttribute("aria-hidden", active ? "false" : "true");
      if (active && shouldAnimate) {
        animatePanel(panel);
      }
    });

    if (shouldUpdateHash) {
      setHash(tabId, false);
    }
  }

  function handleInvalidOrMissingHash() {
    setHash(DEFAULT_TAB, true);
    activateTab(DEFAULT_TAB, { updateHash: false, animate: false });
  }

  function onHashChange() {
    var tabId = getTabIdFromHash(window.location.hash);
    if (!tabId) {
      handleInvalidOrMissingHash();
      return;
    }
    activateTab(tabId, { updateHash: false, animate: true });
  }

  function onTabClick(event) {
    event.preventDefault();
    var tabId = event.currentTarget.dataset.tab;
    if (!isValidTab(tabId)) {
      return;
    }

    activateTab(tabId, { updateHash: false, animate: true, focus: true });

    if (window.location.hash === "#" + tabId) {
      return;
    }
    setHash(tabId, false);
  }

  function onTabKeydown(event) {
    var currentIndex = tabs.findIndex(function (tab) {
      return tab === event.currentTarget;
    });

    if (currentIndex < 0) {
      return;
    }

    var nextIndex = currentIndex;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    var nextTabId = tabs[nextIndex].dataset.tab;
    tabs[nextIndex].focus({ preventScroll: true });
    activateTab(nextTabId, { updateHash: false, animate: true, focus: true });
    setHash(nextTabId, false);
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", onTabClick);
    tab.addEventListener("keydown", onTabKeydown);
  });

  logoButton.addEventListener("click", function () {
    activateTab(DEFAULT_TAB, { updateHash: false, animate: true, focus: false });
    if (window.location.hash === "#" + DEFAULT_TAB) {
      return;
    }
    setHash(DEFAULT_TAB, false);
  });

  window.addEventListener("hashchange", onHashChange);

  if (!getTabIdFromHash(window.location.hash)) {
    handleInvalidOrMissingHash();
  } else {
    activateTab(getTabIdFromHash(window.location.hash), {
      updateHash: false,
      animate: false,
    });
  }
})();
