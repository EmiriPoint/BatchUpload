//https://github.com/Niedzwiedzw/youtube-publish-drafts より引用

//いくつかの値はハードコードされ、トリミングはChatGPT経由で行われる。

(() => {
    const DEBUG_MODE = true; // Set to true for debug logs

    // Common functions
    const TIMEOUT_STEP_MS = 20;
    const DEFAULT_ELEMENT_TIMEOUT_MS = 10000;
    function debugLog(...args) {
        if (!DEBUG_MODE) return;
        console.debug(...args);
    }
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    async function waitForElement(selector, baseEl = document, timeoutMs = DEFAULT_ELEMENT_TIMEOUT_MS) {
        let timeout = timeoutMs;
        while (timeout > 0) {
            let element = baseEl.querySelector(selector);
            if (element) return element;
            await sleep(TIMEOUT_STEP_MS);
            timeout -= TIMEOUT_STEP_MS;
        }
        debugLog(`Could not find ${selector}`);
        return null;
    }

    function click(element) {
        const event = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
        element.dispatchEvent(event);
        debugLog(`${element} clicked`);
    }

    // Publish Drafts Functionality
    const VISIBILITY_PUBLISH_ORDER = { 'Private': 0, 'Unlisted': 1, 'Public': 2 };
    const MADE_FOR_KIDS = false; // Hardcoded to false
    const VISIBILITY = 'Unlisted'; // Hardcoded to Unlisted

    // Selectors
    const VIDEO_ROW_SELECTOR = 'ytcp-video-row';
    const DRAFT_MODAL_SELECTOR = '.style-scope.ytcp-uploads-dialog';
    const DRAFT_BUTTON_SELECTOR = '.edit-draft-button';
    const MADE_FOR_KIDS_SELECTOR = '#made-for-kids-group';
    const RADIO_BUTTON_SELECTOR = 'tp-yt-paper-radio-button';
    const VISIBILITY_STEPPER_SELECTOR = '#step-badge-3';
    const VISIBILITY_PAPER_BUTTONS_SELECTOR = 'tp-yt-paper-radio-group';
    const SAVE_BUTTON_SELECTOR = '#done-button';
    const SUCCESS_ELEMENT_SELECTOR = 'ytcp-video-thumbnail-with-info';

    // Class Definitions
    class VideoRow {
        constructor(raw) {
            this.raw = raw;
        }

        get editDraftButton() {
            return waitForElement(DRAFT_BUTTON_SELECTOR, this.raw, 20);
        }

        async openDraft() {
            debugLog('Opening draft');
            click(await this.editDraftButton);
            return new DraftModal(await waitForElement(DRAFT_MODAL_SELECTOR));
        }
    }

    class DraftModal {
        constructor(raw) {
            this.raw = raw;
        }

        async madeForKidsToggle() {
            return await waitForElement(MADE_FOR_KIDS_SELECTOR, this.raw);
        }

        async madeForKidsPaperButton() {
            const nthChild = MADE_FOR_KIDS ? 1 : 2;
            return await waitForElement(`${RADIO_BUTTON_SELECTOR}:nth-child(${nthChild})`, this.raw);
        }

        async selectMadeForKids() {
            click(await this.madeForKidsPaperButton());
            await sleep(50);
            debugLog(`"Made for kids" set as ${MADE_FOR_KIDS}`);
        }

        async visibilityStepper() {
            return await waitForElement(VISIBILITY_STEPPER_SELECTOR, this.raw);
        }

        async goToVisibility() {
            debugLog('Going to Visibility');
            click(await this.visibilityStepper());
            return new VisibilityModal(this.raw);
        }
    }

    class VisibilityModal {
        constructor(raw) {
            this.raw = raw;
        }

        async radioButtonGroup() {
            return await waitForElement(VISIBILITY_PAPER_BUTTONS_SELECTOR, this.raw);
        }

        async visibilityRadioButton() {
            const group = await this.radioButtonGroup();
            const value = VISIBILITY_PUBLISH_ORDER[VISIBILITY];
            return [...group.querySelectorAll(RADIO_BUTTON_SELECTOR)][value];
        }

        async setVisibility() {
            click(await this.visibilityRadioButton());
            debugLog(`Visibility set to ${VISIBILITY}`);
            await sleep(50);
        }

        async saveButton() {
            return await waitForElement(SAVE_BUTTON_SELECTOR, this.raw);
        }

        async isSaved() {
            await waitForElement(SUCCESS_ELEMENT_SELECTOR, document);
        }

        async dialog() {
            return await waitForElement(DRAFT_MODAL_SELECTOR);
        }

        async save() {
            click(await this.saveButton());
            await this.isSaved();
            debugLog('Saved');
        }
    }

    // Entry Point
    async function publishDrafts() {
        const videos = [...document.querySelectorAll(VIDEO_ROW_SELECTOR)];
        debugLog(`Found ${videos.length} videos`);
        await sleep(1000);

        for (let videoEl of videos) {
            const video = new VideoRow(videoEl);
            const draft = await video.openDraft();
            await draft.selectMadeForKids();
            const visibility = await draft.goToVisibility();
            await visibility.setVisibility();
            await visibility.save();
            await sleep(100);
        }
    }

    publishDrafts();
})();
