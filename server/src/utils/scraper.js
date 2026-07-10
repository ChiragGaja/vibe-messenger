const metascraper = require('metascraper')([
    require('metascraper-title')(),
    require('metascraper-description')(),
    require('metascraper-image')()
]);

/**
 * Extracts all URLs from a given text string.
 * @param {string} text - The input string to parse.
 * @returns {string[]} An array of extracted URLs.
 */
function extractUrls(text) {
    if (!text) return [];
    
    // Regular expression to match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
}

/**
 * Scrapes OpenGraph metadata from a given URL.
 * @param {string} targetUrl - The URL to scrape.
 * @returns {Promise<Object|null>} An object containing title, description, image, url or null on failure.
 */
async function scrapeMetadata(targetUrl) {
    if (!targetUrl) return null;

    try {
        const dns = require('dns');
        const ipaddr = require('ipaddr.js');

        const customLookup = (hostname, options, callback) => {
            dns.lookup(hostname, options, (err, address, family) => {
                if (err) return callback(err);

                try {
                    const addr = ipaddr.parse(address);
                    const range = addr.range();
                    
                    // Block all non-unicast or private IP ranges
                    const blockedRanges = [
                        'unspecified', 'broadcast', 'multicast', 'linkLocal', 'loopback', 
                        'carrierGradeNat', 'private', 'reserved'
                    ];

                    if (blockedRanges.includes(range) || address === '127.0.0.1' || address === '::1') {
                        return callback(new Error(`SSRF Prevention: Access to private/internal IP range (${range}) is forbidden.`));
                    }
                } catch (e) {
                    return callback(new Error('SSRF Prevention: Invalid IP address resolved.'));
                }

                callback(null, address, family);
            });
        };

        const got = (await import('got')).default;
        const { body: html, url } = await got(targetUrl, {
            dnsLookup: customLookup,
            timeout: { request: 3000 },
            retry: { limit: 1 },
            headers: {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            }
        });

        const metadata = await metascraper({ html, url });
        return {
            title: metadata.title,
            description: metadata.description,
            image: metadata.image,
            url: metadata.url || targetUrl // fallback to original if not found
        };
    } catch (error) {
        console.error(`Failed to scrape metadata for ${targetUrl}:`, error.message);
        return null;
    }
}

module.exports = {
    extractUrls,
    scrapeMetadata
};
