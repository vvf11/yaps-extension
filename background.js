// Cache to store Yaps data
const yapsCache = {};

// Listen for messages from content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "fetchYaps") {
    const cacheKey = message.user_id || message.username;
    console.log("Checking cache for:", cacheKey);

    // Check if data exists in the cache
    chrome.storage.local.get([cacheKey], (result) => {
      if (result[cacheKey] && !message.forceRefresh) {
        console.log("Returning cached Yaps data:", result[cacheKey]);
        sendResponse({ success: true, data: result[cacheKey] });
        return;
      }

      // If no data in cache or forceRefresh is requested, make a request
      const fetchPromise = fetchYaps(message.username, message.user_id);
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: false, error: "Request to API timed out after 5 seconds" });
        }, 5000);
      });

      Promise.race([fetchPromise, timeoutPromise])
        .then(result => {
          if (result.success === false) {
            console.error("Fetch Yaps failed:", result.error);
            sendResponse({ success: false, error: result.error });
            return;
          }

          const data = result;
          if (data) {
            // Save data to cache
            chrome.storage.local.set({ [cacheKey]: data }, () => {
              console.log("Cached Yaps data:", data);
            });
          }
          console.log("Sending response with data:", data);
          sendResponse({ success: true, data });
        })
        .catch(error => {
          console.error("Background fetch error:", error.message);
          sendResponse({ success: false, error: error.message });
        });
    });
    return true; // Indicate that the response will be asynchronous
  } else if (message.type === "clearCache") {
    chrome.storage.local.clear(() => {
      console.log("Cache cleared");
      sendResponse({ success: true });
    });
    return true;
  }
});

// Function to fetch Yaps data
async function fetchYaps(username, user_id) {
  let url;
  // First try with user_id if it exists
  if (user_id) {
    url = `https://api.kaito.ai/api/v1/yaps?user_id=${encodeURIComponent(user_id)}`;
    console.log("Fetching Yaps with user_id:", url);
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error("Error fetching with user_id:", error);
    }
  }

  // If fetching with user_id fails, try with username
  url = `https://api.kaito.ai/api/v1/yaps?username=${encodeURIComponent(username)}`;
  console.log("Fetching Yaps with username:", url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Background fetch error:", error);
    throw error;
  }
}