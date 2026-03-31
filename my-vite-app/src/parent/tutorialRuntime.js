export function createTutorialRuntime({
  showScreen,
  openPremiumSetupScreen,
  routeManagerBoard,
  normalizeManagerBoardTab,
  getParentCtxSnapshot,
  escapeHtml,
  pollMs = 60,
  targetAttempts = 18,
  settleMs = 40,
} = {}) {
  function getWineSetupTutorialSteps(role) {
    const roleText =
      role === "group_manager"
        ? "You are editing the currently active restaurant's wines."
        : role === "enterpriser"
        ? "You are editing the currently active restaurant's wine environment from an enterprise-level role."
        : "These wines define your restaurant's selling environment.";

    return [
      {
        id: "intro",
        target: null,
        title: "Wine Setup Tutorial",
        body: "This walkthrough will show you where the wine setup tools are and what each field does.",
        placement: "center",
        action: "none",
        before: async () => {
          showScreen("screenPremiumApp");
        },
      },
      {
        id: "nav-wine-setup",
        target: '[data-tutorial="nav-wine-setup"]',
        title: "Wine Setup",
        body: "Use this button to open the wine configuration screen.",
        placement: "bottom",
        action: "none",
      },
      {
        id: "open-setup",
        target: '[data-tutorial="wine-panel"]',
        title: "Wine Setup Panel",
        body: roleText,
        placement: "top",
        action: "none",
        before: async () => {
          await openPremiumSetupScreen();
        },
      },
      {
        id: "wine-name",
        target: '[data-tutorial="wine-name"]',
        title: "Wine Name",
        body: "Enter the name of the wine here.",
        placement: "bottom",
        action: "none",
      },
      {
        id: "wine-varietal",
        target: '[data-tutorial="wine-varietal"]',
        title: "Varietal",
        body: "This is where you enter the grape or varietal.",
        placement: "bottom",
        action: "none",
      },
      {
        id: "fruit-options",
        target: '[data-tutorial="fruit-options"]',
        title: "Fruit Profile",
        body: "This section defines the fruit character of the wine.",
        placement: "bottom",
        action: "none",
      },
      {
        id: "texture-options",
        target: '[data-tutorial="texture-options"]',
        title: "Structure / Texture",
        body: "This section defines the wine's body and texture profile.",
        placement: "bottom",
        action: "none",
      },
      {
        id: "oak-options",
        target: '[data-tutorial="oak-options"]',
        title: "Oak Level",
        body: "This is where you set the wine's oak influence.",
        placement: "bottom",
        action: "none",
      },
      {
        id: "process",
        target: '[data-tutorial="wine-process"]',
        title: "Process",
        body: "Use this field for optional production details.",
        placement: "bottom",
        action: "none",
      },
      {
        id: "region",
        target: '[data-tutorial="wine-region"]',
        title: "Region",
        body: "This field lets you add the wine's region.",
        placement: "bottom",
        action: "none",
      },
      {
        id: "story",
        target: '[data-tutorial="wine-story"]',
        title: "Story",
        body: "Add a short one-line story or memory hook here.",
        placement: "top",
        action: "none",
      },
      {
        id: "add-button",
        target: '[data-tutorial="wine-add"]',
        title: "Add Wine",
        body: "Once the fields are ready, this button adds the wine to the list.",
        placement: "left",
        action: "none",
      },
      {
        id: "wine-list",
        target: '[data-tutorial="wine-list"]',
        title: "Wine List",
        body: "All configured wines appear here.",
        placement: "top",
        action: "none",
      },
      {
        id: "start-button",
        target: '[data-tutorial="encounter-start"]',
        title: "Start",
        body: "This returns you to the premium app after setup.",
        placement: "top",
        action: "none",
      },
      {
        id: "end",
        target: null,
        title: "Done",
        body: "You've now seen the main wine setup fields and actions.",
        placement: "center",
        action: "none",
      },
    ];
  }

  function getEncounterTutorialSteps(role) {
    void role;
    return [
      {
        id: "intro",
        target: null,
        title: "Encounter Flow",
        body: "This walkthrough will guide you from Start through one full encounter, ending when the next encounter prompt appears.",
        placement: "center",
        before: async () => {
          showScreen("screenPremiumApp");
        },
      },
      {
        id: "play-button",
        target: '[data-tutorial="play-button"]',
        title: "Start a Session",
        body: "Click the real Start/Play button to enter the encounter.",
        placement: "bottom",
        disableNext: true,
        before: async () => {
          await waitForPremiumIframeReady();
          await new Promise((r) => setTimeout(r, 250));
        },
        autoAdvance: async () => {
          await waitForTutorialCondition(() => {
            const win = getGameWindow();
            const doc = win?.document || null;
            const beginBtn = getTutorialButtonTarget(["BEGIN"]);
            const playScreen = doc?.getElementById?.("screenPlay") || null;
            const playVisible = !!playScreen && playScreen.classList.contains("active");
            return !!beginBtn || playVisible;
          }, "begin available");
        },
      },
      {
        id: "load-begin",
        buttonLabels: ["BEGIN"],
        title: "Begin the Encounter",
        body: "The encounter is loaded. Click BEGIN to move into Observe.",
        placement: "top",
        disableNext: true,
        before: async () => {
          await waitForStep(0);
          await waitForAnyButton(["BEGIN"]);
        },
        autoAdvance: async () => {
          await waitForTutorialCondition(() => Number(getGameWindow()?.currentStep) === 1, "begin clicked");
        },
      },
      {
        id: "observe",
        target: '[data-tutorial="guest-clue"]',
        title: "Observe the Guest",
        body: "You are now in Observe. Read the guest prompt and cues before choosing a read.",
        placement: "bottom",
        disableNext: true,
        before: async () => {
          await waitForStep(1);
        },
        autoAdvance: async () => {
          await waitMs(900);
        },
      },
      {
        id: "select-read",
        target: '[data-tutorial="guest-clue"]',
        title: "Choose a Read",
        body: "You are in Observe. Read the guest and select the guest type from the buttons in this panel.",
        placement: "top",
        disableNext: true,
        before: async () => {
          await waitForStep(1);
        },
        autoAdvance: async () => {
          await waitForTutorialCondition(
            () => Number(getGameWindow()?.currentStep) === 1 && !!getGameEncounter()?.guestReadSelected,
            "guest read selected"
          );
        },
      },
      {
        id: "lock-in",
        buttonLabels: ["LOCK IN"],
        title: "Lock It In",
        body: "Now click LOCK IN to confirm your read.",
        placement: "top",
        before: async () => {
          await waitForStep(1);
          await waitForButton("LOCK IN");
        },
        disableNext: true,
        autoAdvance: async () => {
          await waitForTutorialCondition(() => Number(getGameWindow()?.currentStep) === 55, "observe preview shown");
        },
      },
      {
        id: "observe-preview",
        buttonLabels: ["CONTINUE TO NEXT STEP"],
        title: "Continue to Mode",
        body: "The game shows a quick step reaction here. Click CONTINUE TO NEXT STEP to move into Mode.",
        placement: "top",
        disableNext: true,
        before: async () => {
          await waitForStep(55);
          await waitForAnyButton(["CONTINUE TO NEXT STEP"]);
        },
        autoAdvance: async () => {
          await waitForTutorialCondition(() => Number(getGameWindow()?.currentStep) === 2, "mode step shown");
        },
      },
      {
        id: "select-mode",
        target: '[data-tutorial="guest-clue"]',
        title: "Select a Mode",
        body: "You are in Mode. Choose how you want to handle the guest.",
        placement: "top",
        disableNext: true,
        before: async () => {
          await waitForStep(2);
        },
        autoAdvance: async () => {
          await waitForTutorialCondition(
            () => Number(getGameWindow()?.currentStep) === 2 && !!getGameEncounter()?.modeSelected,
            "mode selected"
          );
        },
      },
      {
        id: "continue-mode",
        buttonLabels: ["CONTINUE"],
        title: "Continue",
        body: "Click CONTINUE to lock in your approach.",
        placement: "top",
        before: async () => {
          await waitForStep(2);
          await waitForButton("CONTINUE");
        },
        disableNext: true,
        autoAdvance: async () => {
          await waitForTutorialCondition(() => Number(getGameWindow()?.currentStep) === 55, "mode preview shown");
        },
      },
      {
        id: "mode-preview",
        buttonLabels: ["CONTINUE TO NEXT STEP"],
        title: "Continue to Hook",
        body: "The game shows another quick reaction here. Click CONTINUE TO NEXT STEP to move into Hook.",
        placement: "top",
        disableNext: true,
        before: async () => {
          await waitForStep(55);
          await waitForAnyButton(["CONTINUE TO NEXT STEP"]);
        },
        autoAdvance: async () => {
          await waitForTutorialCondition(() => Number(getGameWindow()?.currentStep) === 3, "hook step shown");
        },
      },
      {
        id: "select-hook",
        target: '[data-tutorial="guest-clue"]',
        title: "Select a Hook",
        body: "You are in Hook. Choose the opening angle for your recommendation.",
        placement: "top",
        disableNext: true,
        before: async () => {
          await waitForStep(3);
        },
        autoAdvance: async () => {
          await waitForTutorialCondition(
            () => Number(getGameWindow()?.currentStep) === 3 && !!getGameEncounter()?.hookSelected,
            "hook selected"
          );
        },
      },
      {
        id: "continue-hook",
        buttonLabels: ["CONTINUE"],
        title: "Continue",
        body: "Click CONTINUE to lock in the opening angle.",
        placement: "top",
        before: async () => {
          await waitForStep(3);
          await waitForButton("CONTINUE");
        },
        disableNext: true,
        autoAdvance: async () => {
          await waitForTutorialCondition(() => Number(getGameWindow()?.currentStep) === 55, "hook preview shown");
        },
      },
      {
        id: "hook-preview",
        buttonLabels: ["CONTINUE TO NEXT STEP"],
        title: "Continue to Delivery",
        body: "Click CONTINUE TO NEXT STEP to move into Delivery.",
        placement: "top",
        disableNext: true,
        before: async () => {
          await waitForStep(55);
          await waitForAnyButton(["CONTINUE TO NEXT STEP"]);
        },
        autoAdvance: async () => {
          await waitForTutorialCondition(() => Number(getGameWindow()?.currentStep) === 4, "delivery step shown");
        },
      },
      {
        id: "select-delivery",
        target: '[data-tutorial="guest-clue"]',
        title: "Select Both Lines",
        body: "You are in Delivery. Choose one option from each delivery group to build the two-sentence pitch.",
        placement: "top",
        disableNext: true,
        before: async () => {
          await waitForStep(4);
        },
        autoAdvance: async () => {
          await waitForTutorialCondition(
            () =>
              Number(getGameWindow()?.currentStep) === 4 &&
              getGameEncounter()?.selectedS1 != null &&
              getGameEncounter()?.selectedS2 != null,
            "delivery lines selected"
          );
        },
      },
      {
        id: "continue-delivery",
        buttonLabels: ["SAY IT"],
        title: "Say It",
        body: "Click SAY IT to deliver the recommendation and resolve the encounter.",
        placement: "top",
        before: async () => {
          await waitForStep(4);
          await waitForButton("SAY IT");
        },
        disableNext: true,
        autoAdvance: async () => {
          await waitForTutorialCondition(() => Number(getGameWindow()?.currentStep) === 55, "delivery preview shown");
        },
      },
      {
        id: "delivery-preview",
        buttonLabels: ["GO TO REACTION"],
        title: "Go to Reaction",
        body: "Click GO TO REACTION to see the encounter result.",
        placement: "top",
        disableNext: true,
        before: async () => {
          await waitForStep(55);
          await waitForAnyButton(["GO TO REACTION"]);
        },
        autoAdvance: async () => {
          await waitForTutorialCondition(() => Number(getGameWindow()?.currentStep) === 5, "reaction shown");
        },
      },
      {
        id: "reaction-to-reflection",
        buttonLabels: ["REFLECT", "CONTINUE TO REFLECTION"],
        title: "Move to Reflection",
        body: "Read the result, then click REFLECT or CONTINUE TO REFLECTION to close out the encounter.",
        placement: "top",
        disableNext: true,
        before: async () => {
          await waitForStep(5);
          await waitForAnyButton(["REFLECT", "CONTINUE TO REFLECTION"]);
        },
        autoAdvance: async () => {
          await waitForTutorialCondition(() => {
            const step = Number(getGameWindow()?.currentStep);
            return step === 6 || step === 7;
          }, "reflection shown");
        },
      },
      {
        id: "reflection-summary",
        target: '[data-tutorial="reflection-summary"]',
        title: "Reflection Summary",
        body: "This summary highlights what worked, what to fix next, and the coaching focus to carry into the next encounter.",
        placement: "top",
        before: async () => {
          await waitForTutorialCondition(() => {
            const step = Number(getGameWindow()?.currentStep);
            return (step === 6 || step === 7) && !!getTutorialTarget('[data-tutorial="reflection-summary"]');
          }, "reflection summary ready");
        },
      },
      {
        id: "next-encounter",
        target: "#stepContent",
        buttonLabels: ["NEXT ENCOUNTER", "NEXT REP", "BACK HOME"],
        title: "Next Encounter",
        body: "The encounter is complete. The next prompt is ready. This ends the tutorial.",
        placement: "bottom",
        disableNext: true,
        before: async () => {
          await waitForAnyButton(["NEXT ENCOUNTER", "NEXT REP", "BACK HOME"]);
        },
        autoAdvance: async () => {
          await waitMs(1400);
        },
      },
      {
        id: "end",
        target: null,
        title: "Complete",
        body: "You have been guided from Start through one full encounter to the next-encounter prompt.",
        placement: "center",
      },
    ];
  }

  function isManagerBoardVisible() {
    const screen = document.getElementById("screenManagerBoard");
    return !!screen && !screen.classList.contains("hidden");
  }

  async function ensureManagerBoardTutorialReady() {
    if (isManagerBoardVisible() && document.getElementById("mbMenu")) return;
    await routeManagerBoard("tutorial_manager_board");
  }

  async function openManagerBoardTutorialTab(tab) {
    const normalized = normalizeManagerBoardTab(tab);
    await ensureManagerBoardTutorialReady();
    window.__BC_MB_SHOWTAB__?.(normalized);
    try {
      await Promise.race([
        Promise.resolve(window.__BC_MB_LOADTAB__?.(normalized)),
        waitMs(1500),
      ]);
    } catch (error) {
      console.warn("[TUTORIAL] manager board tab load failed", normalized, error);
    }
    await waitMs(150);
  }

  function getManagerBoardTutorialSteps(role) {
    const steps = [
      {
        id: "intro",
        target: null,
        title: "Manager Board",
        body: "This walkthrough takes you through the Manager Board tabs and key sections. Press Continue in this prompt to move to the next tutorial screen.",
        placement: "center",
        before: async () => {
          await ensureManagerBoardTutorialReady();
        },
      },
      {
        id: "tabs",
        target: "#mbMenu",
        title: "Board Navigation",
        body: "This tab row is the main Manager Board navigation. The tutorial will take you through each area one by one.",
        placement: "bottom",
        before: async () => {
          await openManagerBoardTutorialTab("overview");
        },
      },
      {
        id: "overview",
        target: '[data-tutorial="mb-panel-overview"]',
        title: "Overview",
        body: "Overview gives you the top-level restaurant summary, current activity, challenge summaries, and quick operational context.",
        placement: "top",
        before: async () => {
          await openManagerBoardTutorialTab("overview");
        },
      },
      {
        id: "people-tab",
        target: '[data-tutorial="mb-tab-people"]',
        title: "People Tab",
        body: "Use People to manage invites, refresh members, and review the staff list for the active restaurant.",
        placement: "bottom",
        before: async () => {
          await openManagerBoardTutorialTab("people");
        },
      },
      {
        id: "people-panel",
        target: '[data-tutorial="mb-panel-people"]',
        title: "People Section",
        body: "This section contains invite management, member refresh, search, and the current member roster.",
        placement: "top",
        before: async () => {
          await openManagerBoardTutorialTab("people");
        },
      },
      {
        id: "messenger-tab",
        target: '[data-tutorial="mb-tab-messenger"]',
        title: "Messenger Tab",
        body: "Messenger is where you review waiter threads, assign challenges, and send direct coaching messages.",
        placement: "bottom",
        before: async () => {
          await openManagerBoardTutorialTab("messenger");
        },
      },
      {
        id: "messenger-panel",
        target: '[data-tutorial="mb-panel-messenger"]',
        title: "Messenger Section",
        body: "This area combines challenge assignment, thread review, suggested prompts, and outbound coaching actions.",
        placement: "top",
        before: async () => {
          await openManagerBoardTutorialTab("messenger");
        },
      },
      {
        id: "live-controls-tab",
        target: '[data-tutorial="mb-tab-live-controls"]',
        title: "Live Controls Tab",
        body: "Live Controls is where you manage active effects, quick actions, drills, and challenge controls.",
        placement: "bottom",
        before: async () => {
          await openManagerBoardTutorialTab("live_controls");
        },
      },
      {
        id: "live-controls-panel",
        target: '[data-tutorial="mb-panel-live-controls"]',
        title: "Live Controls Section",
        body: "These panels expose the operational controls that affect live training pressure, abilities, and quick manager actions.",
        placement: "top",
        before: async () => {
          await openManagerBoardTutorialTab("live_controls");
        },
      },
      {
        id: "performance-tab",
        target: '[data-tutorial="mb-tab-performance"]',
        title: "Performance Tab",
        body: "Performance shows history, coaching signals, recent activity, and weekly reporting.",
        placement: "bottom",
        before: async () => {
          await openManagerBoardTutorialTab("performance");
        },
      },
      {
        id: "performance-panel",
        target: '[data-tutorial="mb-panel-performance"]',
        title: "Performance Section",
        body: "Use this section to inspect training quality over time, identify coaching needs, and review recent performance summaries.",
        placement: "top",
        before: async () => {
          await openManagerBoardTutorialTab("performance");
        },
      },
      {
        id: "selection-tab",
        target: '[data-tutorial="mb-tab-selection"]',
        title: "Selection Tab",
        body: "Selection is the tournament and selection area for candidate evaluation and comparison.",
        placement: "bottom",
        before: async () => {
          await openManagerBoardTutorialTab("selection");
        },
      },
      {
        id: "selection-panel",
        target: '[data-tutorial="mb-panel-selection"]',
        title: "Selection Section",
        body: "This area is used for selection review, comparisons, and candidate-facing training decisions.",
        placement: "top",
        before: async () => {
          await openManagerBoardTutorialTab("selection");
        },
      },
      {
        id: "billing-tab",
        target: '[data-tutorial="mb-tab-billing"]',
        title: "Listing Tab",
        body: "Listing covers seat and access information for the restaurant.",
        placement: "bottom",
        before: async () => {
          await openManagerBoardTutorialTab("billing");
        },
      },
      {
        id: "billing-panel",
        target: '[data-tutorial="mb-panel-billing"]',
        title: "Listing Section",
        body: "Here you can review current seat usage, refresh access details, and see the current provisioning context.",
        placement: "top",
        before: async () => {
          await openManagerBoardTutorialTab("billing");
        },
      },
    ];

    if (String(role || "").toLowerCase() === "enterpriser") {
      steps.push(
        {
          id: "enterprise-tab",
          target: '[data-tutorial="mb-tab-enterprise"]',
          title: "Enterprise Tab",
          body: "Enterprise opens the enterprise-only controls and rollup surfaces.",
          placement: "bottom",
          before: async () => {
            await openManagerBoardTutorialTab("enterprise");
          },
        },
        {
          id: "enterprise-panel",
          target: '[data-tutorial="mb-panel-enterprise"]',
          title: "Enterprise Section",
          body: "This section is reserved for enterprise-level controls and cross-restaurant management surfaces.",
          placement: "top",
          before: async () => {
            await openManagerBoardTutorialTab("enterprise");
          },
        }
      );
    }

    steps.push({
      id: "end",
      target: null,
      title: "Complete",
      body: "You have been guided through the main Manager Board tabs and sections.",
      placement: "center",
    });

    return steps;
  }

  function getGameWindow() {
    const frame = document.getElementById("premiumRootFrame");
    return frame?.contentWindow || null;
  }

  function getGameEncounter() {
    const win = getGameWindow();
    return win?.currentEncounter || win?.__BC_LAST_ENCOUNTER__ || null;
  }

  function isTutorialStillActive() {
    return !!window.__BC_TUTORIAL__?.active;
  }

  async function waitForTutorialCondition(predicate, label = "condition") {
    while (isTutorialStillActive()) {
      try {
        if (predicate()) return;
      } catch (error) {
        console.warn("[TUTORIAL] waitForTutorialCondition error", label, error);
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }
  }

  async function waitMs(ms) {
    await new Promise((r) => setTimeout(r, Number(ms) || 0));
  }

  async function waitForPremiumIframeReady() {
    while (isTutorialStillActive()) {
      if (getTutorialTarget('[data-tutorial="play-button"]')) return;
      await new Promise((r) => setTimeout(r, pollMs));
    }
  }

  async function waitForStep(stepIndex) {
    while (isTutorialStillActive()) {
      const win = getGameWindow();
      if (win && Number(win.currentStep) === Number(stepIndex)) return;
      await new Promise((r) => setTimeout(r, pollMs));
    }
  }

  async function waitForButton(label) {
    return waitForAnyButton([label]);
  }

  async function waitForAnyButton(labels) {
    const wanted = (Array.isArray(labels) ? labels : [labels])
      .map((label) => String(label || "").trim().toLowerCase())
      .filter(Boolean);
    if (!wanted.length) return;

    while (isTutorialStillActive()) {
      if (getTutorialButtonTarget(wanted)) return;
      await new Promise((r) => setTimeout(r, pollMs));
    }
  }

  function startTutorial(id) {
    console.log("[TUTORIAL] start", id);
    closeTutorialMenu();
    removeTutorialOverlay();

    const ctx = getParentCtxSnapshot?.() || {};
    const role = String(ctx.role || "").toLowerCase();

    const tutorial = (window.__BC_TUTORIAL__ ||= {});
    tutorial.active = true;
    tutorial.tutorialId = id;
    tutorial.role = role;
    tutorial.stepIndex = 0;
    tutorial.runToken = Number(tutorial.runToken || 0) + 1;

    if (id === "wine_setup_manager") {
      tutorial.steps = getWineSetupTutorialSteps(role);
    } else if (id === "encounter_setup_manager") {
      tutorial.steps = getEncounterTutorialSteps(role);
    } else if (id === "manager_board_manager") {
      tutorial.steps = getManagerBoardTutorialSteps(role);
    } else {
      tutorial.steps = [];
    }

    void runTutorialStep();
  }

  function stopTutorial() {
    const tutorial = (window.__BC_TUTORIAL__ ||= {});
    tutorial.active = false;
    tutorial.stepIndex = 0;
    tutorial.steps = [];
    tutorial.tutorialId = null;
    tutorial.runToken = Number(tutorial.runToken || 0) + 1;

    removeTutorialOverlay();
    clearTutorialHighlights();
  }

  function nextTutorialStep() {
    const tutorial = window.__BC_TUTORIAL__;
    if (!tutorial?.active) return;

    tutorial.stepIndex += 1;
    tutorial.runToken = Number(tutorial.runToken || 0) + 1;

    void runTutorialStep();
  }

  async function runTutorialStep() {
    try {
      const tutorial = window.__BC_TUTORIAL__;
      if (!tutorial?.active) return;

      const token = Number(tutorial.runToken || 0);
      const step = tutorial.steps?.[tutorial.stepIndex];

      if (!step) {
        stopTutorial();
        return;
      }

      removeTutorialOverlay();
      clearTutorialHighlights();

      if (step.before) {
        await step.before();
        await new Promise((r) => setTimeout(r, settleMs));
      }

      if (!window.__BC_TUTORIAL__?.active) return;
      if (Number(window.__BC_TUTORIAL__?.runToken || 0) !== token) return;

      let el = null;
      let buttonEl = null;
      if (Array.isArray(step.buttonLabels) && step.buttonLabels.length) {
        for (let i = 0; i < targetAttempts; i++) {
          buttonEl = getTutorialButtonTarget(step.buttonLabels);
          if (buttonEl) break;
          await new Promise((r) => setTimeout(r, pollMs));
        }
      }
      if (step.target) {
        for (let i = 0; i < targetAttempts; i++) {
          el = getTutorialTarget(step.target);
          if (el) break;
          await new Promise((r) => setTimeout(r, pollMs));
        }
      }
      if (!el) el = buttonEl;

      showTutorialOverlay({
        target: el,
        title: step.title || "",
        body: step.body || "",
        placement: step.placement || "bottom",
        optional: !!step.optional,
        disableNext: !!step.disableNext,
        nextLabel: step.nextLabel || "Next",
        onNext: () => {
          if (step.action === "click" && buttonEl) buttonEl.click();
          nextTutorialStep();
        },
        onExit: stopTutorial,
      });

      if (typeof step.autoAdvance === "function") {
        void (async () => {
          await step.autoAdvance();
          const liveTutorial = window.__BC_TUTORIAL__;
          if (!liveTutorial?.active) return;
          if (Number(liveTutorial.runToken || 0) !== token) return;
          nextTutorialStep();
        })();
      }
    } catch (err) {
      console.error("[TUTORIAL] runTutorialStep failed", err);
    }
  }

  function getTutorialDocuments() {
    const docs = [document];
    try {
      const frameDoc = document.getElementById("premiumRootFrame")?.contentWindow?.document || null;
      if (frameDoc && frameDoc !== document) docs.push(frameDoc);
    } catch {}
    return docs;
  }

  function clearTutorialHighlights() {
    getTutorialDocuments().forEach((doc) => {
      doc.querySelectorAll("[data-tutorial-active='true']").forEach((el) => {
        el.removeAttribute("data-tutorial-active");
      });
    });
  }

  function isVisibleTutorialTarget(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect?.();
    if (!rect || rect.width <= 0 || rect.height <= 0) return false;

    const win = el.ownerDocument?.defaultView || window;
    const style = win.getComputedStyle?.(el);
    if (style && (style.display === "none" || style.visibility === "hidden" || style.opacity === "0")) {
      return false;
    }

    let node = el;
    while (node && node !== el.ownerDocument?.body) {
      if (node.classList?.contains("hidden")) return false;
      node = node.parentElement;
    }

    return true;
  }

  function findVisibleTutorialTarget(doc, selector) {
    if (!doc || !selector) return null;
    const matches = Array.from(doc.querySelectorAll(selector));
    return matches.find((el) => isVisibleTutorialTarget(el)) || matches[0] || null;
  }

  function getTutorialTarget(selector) {
    let el = findVisibleTutorialTarget(document, selector);
    if (el) return el;

    const frame = document.getElementById("premiumRootFrame");
    const doc = frame?.contentDocument || frame?.contentWindow?.document;
    if (doc) {
      el = findVisibleTutorialTarget(doc, selector);
      if (el) return el;
    }

    return null;
  }

  function getTutorialTargetRect(target) {
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    const ownerDoc = target.ownerDocument || document;
    if (ownerDoc === document) return rect;

    const frameEl = document.getElementById("premiumRootFrame");
    const frameRect = frameEl?.getBoundingClientRect?.();
    if (!frameRect) return rect;

    return {
      top: frameRect.top + rect.top,
      right: frameRect.left + rect.right,
      bottom: frameRect.top + rect.bottom,
      left: frameRect.left + rect.left,
      width: rect.width,
      height: rect.height,
    };
  }

  function getTutorialButtonTarget(labels) {
    const wanted = (Array.isArray(labels) ? labels : [labels])
      .map((label) => String(label || "").trim().toLowerCase())
      .filter(Boolean);
    if (!wanted.length) return null;

    for (const doc of getTutorialDocuments()) {
      const buttons = Array.from(doc.querySelectorAll("button"));
      const match = buttons.find((btn) => {
        if (!isVisibleTutorialTarget(btn)) return false;
        const text = String(btn.innerText || btn.textContent || "").trim().toLowerCase();
        return wanted.some((label) => text.includes(label));
      });
      if (match) return match;
    }

    return null;
  }

  function closeTutorialMenu() {
    document.getElementById("bcTutorialMenu")?.remove();
  }

  function openTutorialMenu() {
    closeTutorialMenu();

    const overlay = document.createElement("div");
    overlay.id = "bcTutorialMenu";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.58)";
    overlay.style.backdropFilter = "blur(6px)";
    overlay.style.zIndex = "2147483002";
    overlay.style.display = "grid";
    overlay.style.placeItems = "center";

    const panel = document.createElement("div");
    panel.style.width = "min(420px, calc(100vw - 32px))";
    panel.style.padding = "18px";
    panel.style.borderRadius = "18px";
    panel.style.border = "1px solid rgba(255,255,255,0.12)";
    panel.style.background = "rgba(8,12,17,0.98)";
    panel.style.boxShadow = "0 30px 80px rgba(0,0,0,0.48)";
    panel.style.color = "rgba(244,246,247,0.96)";
    panel.innerHTML = `
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:14px;">
        <div>
          <div style="font-size:11px; letter-spacing:0.12em; text-transform:uppercase; opacity:0.7;">Tutorial Library</div>
          <div style="font-size:20px; font-weight:800; margin-top:4px;">Choose a Tutorial</div>
        </div>
        <button id="bcTutorialMenuClose" type="button" style="min-height:36px; padding:8px 12px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.06); color:inherit;">Close</button>
      </div>
      <button id="bcTutorialWineSetup" type="button" style="width:100%; text-align:left; padding:14px; border-radius:14px; border:1px solid rgba(125,211,252,0.24); background:linear-gradient(180deg, rgba(125,211,252,0.14), rgba(255,255,255,0.03)), rgba(255,255,255,0.03); color:inherit;">
        <div style="font-weight:800; font-size:15px;">Wine Setup Basics</div>
        <div style="font-size:13px; opacity:0.82; margin-top:4px;">A guided tour of the manager wine setup screen, fields, and actions.</div>
      </button>
      <button id="bcTutorialEncounterFlow" type="button" style="width:100%; text-align:left; margin-top:10px; padding:14px; border-radius:14px; border:1px solid rgba(94,234,212,0.24); background:linear-gradient(180deg, rgba(94,234,212,0.14), rgba(255,255,255,0.03)), rgba(255,255,255,0.03); color:inherit;">
        <div style="font-weight:800; font-size:15px;">Encounter Flow</div>
        <div style="font-size:13px; opacity:0.82; margin-top:4px;">A guided walkthrough from setup into the live encounter screen.</div>
      </button>
      <button id="bcTutorialManagerBoard" type="button" style="width:100%; text-align:left; margin-top:10px; padding:14px; border-radius:14px; border:1px solid rgba(251,191,36,0.24); background:linear-gradient(180deg, rgba(251,191,36,0.14), rgba(255,255,255,0.03)), rgba(255,255,255,0.03); color:inherit;">
        <div style="font-weight:800; font-size:15px;">Manager Board</div>
        <div style="font-size:13px; opacity:0.82; margin-top:4px;">A guided walkthrough of the Manager Board tabs and main sections.</div>
      </button>
    `;

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeTutorialMenu();
    });
    document.getElementById("bcTutorialMenuClose")?.addEventListener("click", closeTutorialMenu);
    document.getElementById("bcTutorialWineSetup")?.addEventListener("click", () => {
      closeTutorialMenu();
      startTutorial("wine_setup_manager");
    });
    document.getElementById("bcTutorialEncounterFlow")?.addEventListener("click", () => {
      closeTutorialMenu();
      startTutorial("encounter_setup_manager");
    });
    document.getElementById("bcTutorialManagerBoard")?.addEventListener("click", () => {
      closeTutorialMenu();
      startTutorial("manager_board_manager");
    });
  }

  function placeTutorialCard(card, target, placement = "bottom") {
    const cardWidth = Math.min(card.offsetWidth || 320, window.innerWidth - 24);
    const cardHeight = Math.min(card.offsetHeight || 180, window.innerHeight - 24);
    const isMobileViewport = window.innerWidth <= 760;

    if (!target) {
      card.style.top = "50%";
      card.style.left = "50%";
      card.style.transform = "translate(-50%, -50%)";
      return;
    }

    const rect = getTutorialTargetRect(target);
    if (!rect) {
      card.style.top = "50%";
      card.style.left = "50%";
      card.style.transform = "translate(-50%, -50%)";
      return;
    }

    const gap = 12;
    let top = rect.bottom + gap;
    let left = rect.left + ((rect.width - cardWidth) / 2);
    const centeredLeft = (window.innerWidth - cardWidth) / 2;

    if (placement === "top") {
      top = rect.top - cardHeight - gap;
      left = rect.left + ((rect.width - cardWidth) / 2);
    } else if (placement === "right") {
      top = rect.top + ((rect.height - cardHeight) / 2);
      left = rect.right + gap;
    } else if (placement === "left") {
      top = rect.top + ((rect.height - cardHeight) / 2);
      left = rect.left - cardWidth - gap;
    }

    if (isMobileViewport) {
      left = centeredLeft;
      if (placement === "top") {
        top = rect.top - cardHeight - gap;
      } else {
        top = rect.bottom + gap;
      }
      if (top > window.innerHeight - cardHeight - 12) {
        top = rect.top - cardHeight - gap;
      }
    }

    const maxLeft = window.innerWidth - cardWidth - 12;
    const maxTop = window.innerHeight - cardHeight - 12;
    left = Math.max(12, Math.min(left, maxLeft));
    top = Math.max(12, Math.min(top, maxTop));

    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
  }

  function showTutorialOverlay({
    target,
    title,
    body,
    placement = "bottom",
    optional = false,
    disableNext = false,
    nextLabel = "Next",
    onNext,
    onExit,
  }) {
    removeTutorialOverlay();
    clearTutorialHighlights();

    const overlay = document.createElement("div");
    overlay.id = "bcTutorialOverlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "transparent";
    overlay.style.zIndex = "2147483003";
    overlay.style.pointerEvents = "none";

    const card = document.createElement("div");
    card.style.position = "absolute";
    card.style.width = "320px";
    card.style.maxWidth = "calc(100vw - 24px)";
    card.style.padding = "14px";
    card.style.background = "rgba(8,12,17,0.96)";
    card.style.border = "1px solid rgba(255,255,255,0.12)";
    card.style.borderRadius = "16px";
    card.style.boxShadow = "0 20px 50px rgba(0,0,0,0.45)";
    card.style.color = "#f4f6f7";
    card.style.pointerEvents = "auto";
    card.innerHTML = `
      <div style="font-weight:700; margin-bottom:8px;">${escapeHtml(title || "")}</div>
      <div style="font-size:14px; line-height:1.45; opacity:0.92;">${escapeHtml(body || "")}</div>
      <div style="margin-top:12px; display:flex; gap:8px; justify-content:flex-end;">
        ${optional ? `<button id="tutorialSkipBtn" type="button">Skip</button>` : ""}
        <button id="tutorialNextBtn" type="button" ${disableNext ? "disabled" : ""}>${escapeHtml(nextLabel || "Next")}</button>
        <button id="tutorialExitBtn" type="button">Exit</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    if (target) {
      target.setAttribute("data-tutorial-active", "true");
      const doc = target.ownerDocument;
      doc.querySelectorAll('[data-tutorial-active="true"]').forEach((el) => {
        if (el !== target) el.removeAttribute("data-tutorial-active");
      });
      target.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
      const win = target.ownerDocument.defaultView;
      win?.scrollBy?.(0, -40);
    }

    placeTutorialCard(card, target, placement);

    document.getElementById("tutorialNextBtn")?.addEventListener("click", onNext);
    document.getElementById("tutorialSkipBtn")?.addEventListener("click", onNext);
    document.getElementById("tutorialExitBtn")?.addEventListener("click", onExit);
  }

  function removeTutorialOverlay() {
    document.getElementById("bcTutorialOverlay")?.remove();
    clearTutorialHighlights();
  }

  return {
    openTutorialMenu,
    startTutorial,
  };
}
