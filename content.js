// Function to clear the cache
function clearCache() {
  return new Promise((resolve) => {
    console.log("Clearing cache...");
    chrome.runtime.sendMessage({ type: "clearCache" }, (response) => {
      if (response && response.success) {
        console.log("Cache cleared successfully");
      } else {
        console.error("Error clearing cache");
      }
      resolve();
    });
  });
}

// Function to extract the username from the URL
function getUsername() {
  const path = window.location.pathname; // Get the URL path, e.g., "/VitalikButerin"
  const username = path.split('/')[1]; // Extract the username
  console.log("Extracted username:", username);
  if (username) {
    return username;
  }
  return null;
}

// Function to extract user_id from the X page
function getUserId() {
  const scripts = document.querySelectorAll('script');
  for (const script of scripts) {
    if (script.textContent.includes('user_id')) {
      const match = script.textContent.match(/"user_id":"(\d+)"/);
      if (match) {
        console.log("Found user_id:", match[1]);
        return match[1]; // Return the user_id
      }
    }
  }
  console.log("User_id not found");
  return null;
}

// Function to send a request via background.js with a timeout
function requestYaps(username, user_id, forceRefresh = false) {
  return new Promise((resolve) => {
    console.log("Sending request to background.js for username:", username, "user_id:", user_id, "forceRefresh:", forceRefresh);

    // Set a timeout of 10 seconds
    const timeout = setTimeout(() => {
      console.error("Request to background.js timed out after 10 seconds");
      resolve(null);
    }, 10000);

    try {
      chrome.runtime.sendMessage(
        { type: "fetchYaps", username: username, user_id: user_id, forceRefresh },
        (response) => {
          clearTimeout(timeout); // Cancel the timeout
          console.log("Received response from background.js:", response);
          if (response && response.success) {
            console.log("Yaps data received:", response.data);
            resolve(response.data);
          } else {
            console.error("Error fetching Yaps:", response ? response.error : "No response");
            resolve(null);
          }
        }
      );
    } catch (error) {
      clearTimeout(timeout);
      console.error("Error sending message to background.js:", error);
      resolve(null);
    }
  });
}

// Function to remove old Yaps container and popup
function removeOldYaps() {
  const oldYapsContainer = document.querySelector('.yaps-container');
  if (oldYapsContainer) {
    console.log("Removing old Yaps container...");
    oldYapsContainer.remove();
  }

  const oldYapsPopup = document.querySelector('.yaps-popup');
  if (oldYapsPopup) {
    console.log("Removing old Yaps popup...");
    oldYapsPopup.remove();
  }
}

// Function to display Yaps data on the page
function displayYaps(data) {
  console.log("Attempting to display Yaps data...");
  // Use the provided selector to find the followers element
  const followersElement = document.querySelector('#react-root > div > div > div.css-175oi2r.r-1f2l425.r-13qz1uu.r-417010.r-18u37iz > main > div > div > div > div.css-175oi2r.r-yfoy6g.r-18bvks7.r-1ua6aaf.r-th6na.r-1phboty.r-16y2uox.r-184en5c.r-1abdc3e.r-1lg4w6u.r-f8sm7e.r-13qz1uu.r-1ye8kvj > div > div:nth-child(3) > div > div > div:nth-child(1) > div > div.css-175oi2r.r-13awgt0.r-18u37iz.r-1w6e6rj > div.css-175oi2r.r-1rtiivn > a > span.css-1jxf684.r-bcqeeo.r-1ttztb7.r-qvutc0.r-poiln3.r-1b43r93.r-1cwl3u0.r-b88u0q > span');
  if (!followersElement) {
    console.log("Followers element not found with provided selector");
    return;
  }
  console.log("Found followers element:", followersElement);

  // Find the parent container for profile stats
  const statsContainer = followersElement.closest('div.css-175oi2r.r-13awgt0.r-18u37iz.r-1w6e6rj');
  if (!statsContainer) {
    console.log("Stats container not found");
    return;
  }
  console.log("Found stats container:", statsContainer);

  // Remove old Yaps container if it exists
  removeOldYaps();

  // Create a container for Yaps
  const yapsContainer = document.createElement('div');
  yapsContainer.className = 'yaps-container';
  yapsContainer.style.display = 'inline-block'; // Ensure the container is visible

  // Create an element for the title (clickable)
  const yapsTrigger = document.createElement('span');
  yapsTrigger.className = 'yaps-trigger';

  // Create a popup and add it to <body>
  const yapsPopup = document.createElement('div');
  yapsPopup.className = 'yaps-popup';
  document.body.appendChild(yapsPopup); // Add to <body> to avoid inherited styles

  if (!data) {
    // If no data is available, show a message
    console.log("No Yaps data, showing 'Not Available'");
    yapsTrigger.innerHTML = 'Yaps: N/A';
    yapsPopup.innerHTML = `
      <div class="yaps-header">Yaps Score Details</div>
      <div class="yaps-content">
        <p>No Yaps data available for this user.</p>
      </div>
      <div class="yaps-footer">Powered by Kaito.ai</div>
    `;
  } else {
    // Display the total score and 24-hour change
    console.log("Displaying Yaps data:", data);
    const changeValue = data.yaps_l24h;
    const isNegative = changeValue < 0;
    yapsTrigger.innerHTML = `Yaps: ${data.yaps_all.toFixed(0)} <span class="yaps-change" ${isNegative ? 'data-negative="true"' : ''}>${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(0)} (24h)</span>`;

    // Show the rest of the information in a dropdown
    yapsPopup.innerHTML = `
      <div class="yaps-header">Yaps Score Details</div>
      <div class="yaps-content">
        <div class="yaps-row">
          <span>Total Score:</span>
          <span>${data.yaps_all.toFixed(0)}</span>
        </div>
        <div class="yaps-row">
          <span>24h Change:</span>
          <span>${data.yaps_l24h >= 0 ? '+' : ''}${data.yaps_l24h.toFixed(0)}</span>
        </div>
        <div class="yaps-row">
          <span>7 Days Change:</span>
          <span>${data.yaps_l7d >= 0 ? '+' : ''}${data.yaps_l7d.toFixed(0)}</span>
        </div>
        <div class="yaps-row">
          <span>30 Day Change:</span>
          <span>${data.yaps_l30d >= 0 ? '+' : ''}${data.yaps_l30d.toFixed(0)}</span>
        </div>
      </div>
      <div class="yaps-footer">Powered by Kaito.ai</div>
    `;
  }

  // Add event handler for positioning yapsPopup
  const positionPopup = () => {
    const rect = yapsTrigger.getBoundingClientRect();
    yapsPopup.style.top = `${rect.bottom + window.scrollY}px`;
    yapsPopup.style.left = `${rect.left + window.scrollX}px`;
  };

  yapsContainer.addEventListener('mouseenter', () => {
    positionPopup();
    yapsPopup.style.display = 'block';
  });

  yapsContainer.addEventListener('mouseleave', () => {
    yapsPopup.style.display = 'none';
  });

  // Add yapsTrigger to the container
  yapsContainer.appendChild(yapsTrigger);

  // Insert the container next to the followers count
  statsContainer.appendChild(yapsContainer);
  console.log("Yaps container added to the page (Updated Version 6.0)");
}

// Main function that starts everything
async function init() {
  console.log("Starting init (Updated Version 6.0)...");
  // Clear the cache before making a new request
  await clearCache();

  const username = getUsername();
  const user_id = getUserId(); // Attempt to get user_id

  if (username) {
    console.log(`Fetching Yaps for username: ${username}, user_id: ${user_id || 'not found'}`);
    const yapsData = await requestYaps(username, user_id, true); // forceRefresh: true
    console.log("Yaps data after request:", yapsData);
    displayYaps(yapsData);
  } else {
    console.log("No username found in URL");
  }
}

// Function to observe DOM changes
function observeDOM() {
  console.log("Observing DOM...");
  const targetNode = document.body; // Observe the entire body
  if (!targetNode) {
    console.log("Body not found, retrying...");
    setTimeout(observeDOM, 1000); // Retry after 1 second
    return;
  }

  const observer = new MutationObserver((mutations) => {
    console.log("DOM changed, checking for followers element...");
    const followersElement = document.querySelector('#react-root > div > div > div.css-175oi2r.r-1f2l425.r-13qz1uu.r-417010.r-18u37iz > main > div > div > div > div.css-175oi2r.r-yfoy6g.r-18bvks7.r-1ua6aaf.r-th6na.r-1phboty.r-16y2uox.r-184en5c.r-1abdc3e.r-1lg4w6u.r-f8sm7e.r-13qz1uu.r-1ye8kvj > div > div:nth-child(3) > div > div > div:nth-child(1) > div > div.css-175oi2r.r-13awgt0.r-18u37iz.r-1w6e6rj > div.css-175oi2r.r-1rtiivn > a > span.css-1jxf684.r-bcqeeo.r-1ttztb7.r-qvutc0.r-poiln3.r-1b43r93.r-1cwl3u0.r-b88u0q > span');
    if (followersElement) {
      console.log("Followers element found, running init...");
      observer.disconnect(); // Stop observing
      init();
    }
  });

  observer.observe(targetNode, { childList: true, subtree: true });
  console.log("Started observing DOM changes");
}

// Function to observe URL changes
function observeURLChanges() {
  let lastPathname = window.location.pathname;

  // Check for URL changes every 500 ms
  const checkURL = () => {
    const currentPathname = window.location.pathname;
    if (currentPathname !== lastPathname) {
      console.log(`URL changed from ${lastPathname} to ${currentPathname}, re-running init...`);
      lastPathname = currentPathname;
      removeOldYaps(); // Remove old Yaps data
      observeDOM(); // Restart DOM observation
    }
  };

  // Start checking every 500 ms
  setInterval(checkURL, 500);

  // Also listen for the popstate event for cases when the user uses back/forward buttons
  window.addEventListener('popstate', () => {
    console.log("Popstate event detected, re-running init...");
    removeOldYaps(); // Remove old Yaps data
    observeDOM(); // Restart DOM observation
  });
}

// Start observing DOM and URL
document.addEventListener('DOMContentLoaded', () => {
  console.log("Document loaded, starting DOM and URL observation...");
  observeDOM();
  observeURLChanges();
});

// Additional fallback run after 5 seconds in case DOMContentLoaded didn’t trigger
setTimeout(() => {
  console.log("Fallback: Running observeDOM after 5 seconds...");
  observeDOM();
  observeURLChanges();
}, 5000);