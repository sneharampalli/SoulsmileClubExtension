'use strict';

chrome.runtime.onInstalled.addListener(function(details) {
	// creates new tab with extension instructions when browser extension is first installed
	if (details.reason == "install") {
		chrome.tabs.create({url: 'https://www.soulsmile.club/how-to-use'}, 
	    function () {
	        console.log('Created tab to demonstrate how to use extension');
	    });
	} else if (details.reason == "update") {
		// can add update notification for user when we make major changes (e.g. adding account/giving history)
	}
    console.log("updating to version " + details.version);
});

chrome.runtime.requestUpdateCheck(function(status) {
    if (status == "update_available") {
        console.log("update pending...");
        chrome.runtime.reload();
    } else if (status == "no_update") {
        console.log("no update found");
    } else if (status == "throttled") {
        console.log("Oops, I'm asking too frequently - I need to back off.");
    }
});

chrome.identity.getAuthToken({ interactive: true }, function (token) {
	console.log("get auth token entered");
    if (chrome.runtime.lastError) {
        alert(chrome.runtime.lastError.message);
        return;
    }
    var x = new XMLHttpRequest();
    x.open('GET', 'https://www.googleapis.com/oauth2/v2/userinfo?alt=json&access_token=' + token);
    x.onload = function() {
        console.log("Succeeded");
    };
    x.send();
});
