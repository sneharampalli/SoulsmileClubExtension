$(document).ready(function() {
    // get current URL domain name
    var strippedUrl = stripURL(window.location.href);

    // get lastURLInserted (timestamp of last time user was redirected to affiliate on this site),
    // refreshAffiliate (whether we need to put earning notification right now),
    // and noTimestamp (last time user clicked remind me later)
    chrome.storage.sync.get(['lastURLInserted' + strippedUrl,
        'refreshAffiliate',
        'noTimestamp' + strippedUrl
    ], function (data) {

        if (data.refreshAffiliate) {
            // User just clicked got redirected through affiliate link -- show earning reminder
            chrome.storage.sync.set({refreshAffiliate: false}, function() {
                createEarningReminder();
            });
        }


        if (!data["lastURLInserted" + strippedUrl]) {
            // User has never started earning soulsmiles on this site before
            if (!data["noTimestamp" + strippedUrl]) {
                // User has never clicked remind me later
                createPermissionNotification();
            } else if (Date.now() - data["noTimestamp" + strippedUrl] >= 86400000) {
                // User has clicked remind me later and they need to be asked again
                createPermissionNotification();
            } else {
                // User has clicked remind me later but it hasn't been 24 hours yet -- do nothing
            }
        } else if (Date.now() - data["lastURLInserted" + strippedUrl] >= 86400000) {
            // User is earning soulsmiles on this site but needs to be refreshed
            chrome.storage.sync.set({refreshAffiliate: true}, function() {
                redirectToAffiliate();
            });
        } else {
            // User is earning soulsmiles on this site, no need to refresh, just check for checkout page
            console.log("already earning");
            checkIfCheckoutPage();
        }
    });
});

/* 
 * Creates notification asking user for permission to start earning soulsmiles on this site by
 * creating box using Boundary API
*/
function createPermissionNotification() {
    // create notification box
    var permissionNotification = Boundary.createBox("permissionNotification");

    // add CSS
    Boundary.loadBoxCSS("#permissionNotification", chrome.extension.getURL('bootstrap.min.css'));
	Boundary.loadBoxCSS("#permissionNotification", chrome.extension.getURL('your-stylesheet-for-elements-within-boxes.css'));
    
    // add content
    Boundary.rewriteBox("#permissionNotification", `
    <div class="modal-header">
        <button type="button" id="noButton" class="close" data-dismiss="modal" aria-label="Close">
        <span aria-hidden="true">Remind me later</span>
        </button>
    </div>
    `);
    Boundary.appendToBox("#permissionNotification", `<div>
        <h2 id='soulsmile-title'>soul<span id="smile">smile</span> club</h2>
    </div>
    `);
    Boundary.appendToBox("#permissionNotification", `
    <div>
        <p id='earn-soulsmiles'>Would you like to earn soulsmiles for your purchases?</p>
    </div>`);
    Boundary.appendToBox("#permissionNotification", `
    <div>
        <button type='button' class='btn btn-secondary' id='yesButton'>Yes, please!</button>
    </div>`);
    Boundary.appendToBox("#permissionNotification",`
    <div id="disclosure">
        <b>Disclosure:</b> As an Amazon Associate and an affiliate of other brands, 
        Soulsmile Club earns a commission from qualifying purchases. However, instead of 
        keeping the commission, we donate all of it to causes listed on <a href="https://www.soulsmile.club" target="_blank" rel="noopener noreferrer">our website</a>.
    </div>
    `);

    // add button functionalities
    Boundary.findElemInBox("#noButton", '#permissionNotification').click(function() {
        $('#permissionNotification').remove();
        setNoTimestamp();
    })
	Boundary.findElemInBox("#yesButton", "#permissionNotification").click(function() {
        $('#permissionNotification').remove();
        chrome.storage.sync.set({refreshAffiliate: true}, function() {
            redirectToAffiliate();
        });
    });
}

/*
 * Creates notification reminding users they are earning soulsmiles
 * (after being redirected to affiliate link)
*/
function createEarningReminder() {
    // create notification box
    var earningsNotification = Boundary.createBox("earningsNotification");

    // add CSS
    Boundary.loadBoxCSS("#earningsNotification", chrome.extension.getURL('bootstrap.min.css'));
    Boundary.loadBoxCSS("#earningsNotification", chrome.extension.getURL('your-stylesheet-for-elements-within-boxes.css'));
    
    // add content
    Boundary.rewriteBox("#earningsNotification", `
    <div class="modal-header">
        <button type="button" id="xButton" class="close" data-dismiss="modal" aria-label="Close">
        <span aria-hidden="true">&times;</span>
        </button>
    </div>
    `);
    Boundary.appendToBox("#earningsNotification", `<div id='soulsmile-title'>
        <h2>soul<span id="smile">smile</span> club</h2>
    </div>
    `);
    Boundary.appendToBox("#earningsNotification", `
    <div>
        <p id='earn-soulsmiles'>You are earning soulsmiles for your purchases on this website!</p>
    </div>`);

    // add button functionality
    Boundary.findElemInBox("#xButton", '#earningsNotification').click(function() {
        $('#earningsNotification').remove();
    })
}

/*
 * Strips full-length URL to just domain name, with no http, www, or parameters (e.g. just amazon.com)
 * @param urlString: string containing full URL of current website
 * @return: string of stripped URL
*/
function stripURL(urlString) {
    var url = new URL(urlString);

    // gets hostname from URL and strips it of www. (if it exists)
    var strippedUrl = url.hostname.indexOf('www.') && url.hostname || url.hostname.replace('www.', '');
    
    // removes any prefixes to only include last 2 portions of hostname (e.g. buy.logitech.com --> logitech.com)
    var splitUrl = strippedUrl.split(".");
    return splitUrl[splitUrl.length-2] + "." + splitUrl[splitUrl.length-1];
}

/*
 * Reads checkout JSON file to check if current URL is a checkout page (and then display checkout notification if so)
*/
function checkIfCheckoutPage() {
    // gets JSON file (public/checkout.json) containing mapping of domain name to URL keyword indicating it is a checkout page
    // *** IMPORTANT NOTE: to update with future partner sites, add new site to checkout.json with keyword that URL must contain when reaching the checkout page
    const url = chrome.runtime.getURL('checkout.json');
    fetch(url)
        .then((response) => response.json())
        .then((json) => displayCheckoutNotif(json));
}

/* 
 * Helper function for checkIfCheckoutPage, takes JSON of domain names mapped to checkout URL keywords
 * and shows earning reminder notification if current URL is checkout page
*/
function displayCheckoutNotif(checkouts) {
    var urlString = window.location.href;
    var strippedUrl = stripURL(urlString);
    if (urlString.includes(checkouts[strippedUrl])) {
        // TODO: only display earning reminder if it hasn't been shown in the past 5 (?) minutes
        createEarningReminder();
    }
}

/* 
 * Sets noTimestamp with current time, should be called when user clicks "remind me later" so we can store last time they have been reminded
*/
function setNoTimestamp() {
    var strippedUrl = stripURL(window.location.href);
    var key = "noTimestamp" + strippedUrl;
    chrome.storage.sync.set({[key]: Date.now()}, function() {
        console.log("New no timestamp for " + strippedUrl + " is " + Date.now());
    });
}

/* 
 * Redirects current page to the affiliate link of the website, also storing timestamp in lastURLInserted
 * to keep track of how long it's been since the last affiliate link redirection for this site
*/
function redirectToAffiliate() {
    var strippedUrl = stripURL(window.location.href);
    var key = "lastURLInserted" + strippedUrl;
    chrome.storage.sync.set({[key]: Date.now()}, function() {
        console.log("New timestamp for " + strippedUrl + " is " + Date.now());

        // check if current site is amazon
        if (window.location.href.includes('amazon.com')) {
            // amazon must simply insert the tag into the current URL, maintaining all other parameters of URL and therefore redirecting to the same page
            addAmazonTagURL();
        } else {
            // other websites will redirect to affiliate link specified in JSON file (public/affiliates.json)
            // *** IMPORTANT NOTE: to update with future partner sites, add new site to affiliates.json with affiliate link
            const url = chrome.runtime.getURL('affiliates.json');
            fetch(url)
                .then((response) => response.json())
                .then((json) => getAffiliateLink(json));
        }
    });
}

/* 
 * Reads affiliates JSON and redirects to the affiliate link of the website we are currently on
 * @param affiliates: JSON (read from public/affiliates.json) containing mapping of domain names to affiliate links
*/
function getAffiliateLink(affiliates) {
    var strippedUrl = stripURL(window.location.href);
    window.location.href = affiliates[strippedUrl];
}

/* 
 * Inserts Amazon-specific soulsmile affiliate tag to current URL
*/
function addAmazonTagURL() {
    if (!window.location.href.includes('tag=soulsmilecl09-20')
        && !window.location.href.includes('tag=soulsmileclubblm-20')
        && !window.location.href.includes('tag=soulsmileclubcovid-20')
        && !window.location.href.includes('tag=soulsmileclubswe-20')) {
        // add soulsmilecl09-20 tag as a parameter to current URL
        var url = new URL(window.location.href)
        url.searchParams.append('tag', 'soulsmilecl09-20')

        // redirect to new URL with tag
        window.location.href = url
    } else {
        // do not insert if the user has already just clicked one of our affiliate links from the soulsmile website, just reload page to show notification
        window.location.href = window.location.href;
        console.log('Page reloaded');
    }
};