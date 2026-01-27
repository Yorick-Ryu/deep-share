// Global variable to store custom locale messages
let customLocaleMessages = null;
let currentLanguage = 'auto';

// Initialize the onboarding page
document.addEventListener('DOMContentLoaded', async () => {
  // Load language preference
  await loadLanguagePreference();

  // Load all i18n text
  loadI18nText();

  // Set up event listeners
  setupEventListeners();

  // Load saved formula format (if any) - useful if user revisits this page
  loadSavedSettings();
});

// Function to load language preference and custom locale messages
async function loadLanguagePreference() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['preferredLanguage'], async (data) => {
      currentLanguage = data.preferredLanguage || 'auto';

      if (currentLanguage !== 'auto') {
        await loadLocaleMessages(currentLanguage);
      }

      resolve();
    });
  });
}

// Function to load messages from a specific locale file
async function loadLocaleMessages(locale) {
  try {
    const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
    const response = await fetch(url);
    if (response.ok) {
      customLocaleMessages = await response.json();
    } else {
      console.error(`Failed to load locale ${locale}:`, response.status);
      customLocaleMessages = null;
    }
  } catch (error) {
    console.error(`Error loading locale ${locale}:`, error);
    customLocaleMessages = null;
  }
}

// Function to get a message (from custom locale or chrome.i18n)
function getMessage(key, substitutions) {
  // If we have custom locale messages and the key exists, use it
  if (customLocaleMessages && customLocaleMessages[key]) {
    let message = customLocaleMessages[key].message;
    // Handle substitutions if provided
    if (substitutions) {
      const subs = Array.isArray(substitutions) ? substitutions : [substitutions];
      subs.forEach((sub, index) => {
        message = message.replace(`$${index + 1}`, sub);
      });
    }
    return message;
  }
  // Otherwise, use chrome.i18n.getMessage
  return chrome.i18n.getMessage(key, substitutions);
}

// Load all i18n text
function loadI18nText() {
  // Welcome section
  document.getElementById('welcomeTitle').textContent = getMessage('onboardingWelcomeTitle') || 'Welcome to DeepShare!';
  document.getElementById('welcomeSubtitle').textContent = getMessage('onboardingWelcomeSubtitle') || 'Let\'s set up formula copying for your workflow';

  // Selection section
  document.getElementById('selectionTitle').textContent = getMessage('onboardingSelectionTitle') || 'Choose Your Formula Format';
  document.getElementById('selectionDescription').textContent = getMessage('onboardingSelectionDescription') || 'You can change this later in the extension settings';

  // MathML option
  document.getElementById('mathmlDescription').textContent = getMessage('onboardingMathMLDescription') || 'Perfect for Microsoft Word users';
  document.getElementById('mathmlRecommended').textContent = getMessage('onboardingRecommended') || 'Recommended';

  // LaTeX option
  document.getElementById('latexDescription').textContent = getMessage('onboardingLaTeXDescription') || 'For WPS, MathType, and Overleaf users';

  // Learn more
  document.getElementById('learnMoreText').textContent = getMessage('onboardingLearnMoreText') || 'Learn more about formula copying:';
  document.getElementById('learnMoreLink').textContent = getMessage('onboardingLearnMoreLink') || 'View Tutorial';

  // Continue button
  document.getElementById('continueText').textContent = getMessage('onboardingContinue') || 'Continue';

  // Pin step
  document.getElementById('pinTitle').textContent = getMessage('onboardingPinTitle') || 'Pin DeepShare to Your Toolbar';
  document.getElementById('pinSubtitle').textContent = getMessage('onboardingPinSubtitle') || 'Pin the extension for quick access to settings';
  document.getElementById('pinStep1').textContent = getMessage('onboardingPinStep1') || 'Click the puzzle icon in your browser toolbar';
  document.getElementById('pinStep2').textContent = getMessage('onboardingPinStep2') || 'Find DeepShare and click the pin icon';
  document.getElementById('pinStep3').textContent = getMessage('onboardingPinStep3') || 'Click the DeepShare icon anytime to access settings';
  document.getElementById('learnMoreUsageText').textContent = getMessage('onboardingLearnMoreUsageText') || 'Learn more about using the extension:';
  document.getElementById('learnMoreUsageLink').textContent = getMessage('onboardingLearnMoreUsageLink') || 'View Tutorials';
  document.getElementById('backText').textContent = getMessage('onboardingBack') || 'Back';
  document.getElementById('finishText').textContent = getMessage('onboardingFinish') || 'Got it!';
}

// Set up event listeners
function setupEventListeners() {
  // Continue button click
  document.getElementById('continueBtn').addEventListener('click', handleContinue);

  // Back button click
  document.getElementById('backBtn').addEventListener('click', handleBack);

  // Finish button click
  document.getElementById('finishBtn').addEventListener('click', handleFinish);

  // Allow pressing Enter to continue/finish
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const pinStep = document.getElementById('pinStep');
      if (pinStep.style.display === 'none') {
        handleContinue();
      } else {
        handleFinish();
      }
    }
  });
}

// Load saved settings
function loadSavedSettings() {
  chrome.storage.sync.get(['formulaFormat'], (data) => {
    if (data.formulaFormat) {
      const formatInput = document.querySelector(`input[value="${data.formulaFormat}"]`);
      if (formatInput) {
        formatInput.checked = true;
      }
    }
  });
}

// Handle continue button click
function handleContinue() {
  // Get selected formula format
  const selectedFormat = document.querySelector('input[name="formulaFormat"]:checked').value;

  // Save the selected format
  chrome.storage.sync.set({
    formulaFormat: selectedFormat
  }, () => {
    // Hide the first step and show the pin step
    const firstStep = document.querySelector('.onboarding-content:not(.pin-step)');
    const pinStep = document.getElementById('pinStep');
    
    firstStep.style.display = 'none';
    pinStep.style.display = 'block';
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// Handle back button click
function handleBack() {
  // Show the first step and hide the pin step
  const firstStep = document.querySelector('.onboarding-content:not(.pin-step)');
  const pinStep = document.getElementById('pinStep');
  
  pinStep.style.display = 'none';
  firstStep.style.display = 'block';
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Handle finish button click
function handleFinish() {
  // Mark onboarding as completed
  chrome.storage.sync.set({
    onboardingCompleted: true
  }, () => {
    // Close the onboarding tab
    chrome.tabs.getCurrent((tab) => {
      chrome.tabs.remove(tab.id);
    });
  });
}
