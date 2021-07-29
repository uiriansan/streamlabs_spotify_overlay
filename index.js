/*   ###################################    */
// https://developer.spotify.com/dashboard/
const client_id = '#######';
const client_secret = '#######';
const redirec_url = '#######';

const overlay = document.getElementById('overlay');
const trackEl = document.getElementById('track_title');
const artistEl = document.getElementById('artist_name');
const albumCoverEl = document.getElementById('cover_image');
const albumCoverGradientEl = document.querySelector('.cover_gradient');
const elapsedTimestampEl = document.querySelector('.elapsed-timestamp');


var accessToken = '';
var refreshToken = '';
var tokenExpiresIn = 3300000;

var currentPlayingUUID = null;
var currentTimestamp = null;
var currentProgress = null;


const requestAuth = async () => {
    if (!getUrlParameter('code')) window.location.replace('http://localhost:3535/request_auth');
    if (getUrlParameter('error')) return;

    accessToken = getUrlParameter('code');

    $.ajax({
        type: 'POST',
        url: 'https://accounts.spotify.com/api/token',
        data: {
            grant_type: 'authorization_code',
            code: accessToken,
            redirect_uri: redirec_url,
            client_id: client_id,
            client_secret: client_secret
        },
        success: function(data, textStatus, xhr) {
            if (!data) return;

            accessToken = data.access_token;
            refreshToken = data.refresh_token;
            tokenExpiresIn = data.expires_in;

            
            console.log(accessToken + ' ' + refreshToken + ' ' + tokenExpiresIn);

            window.setInterval(refreshAccessToken, tokenExpiresIn * 1000 - 30000);
        },
        dataType: 'json'
    });
};

const hexToRgb = (hex) => {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
}

const invertColor = (hex, bw) => {
    if (hex.indexOf('#') === 0) {
        hex = hex.slice(1);
    }
    // convert 3-digit hex to 6-digits.
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length !== 6) {
        throw new Error('Invalid HEX color.');
    }
    var r = parseInt(hex.slice(0, 2), 16),
        g = parseInt(hex.slice(2, 4), 16),
        b = parseInt(hex.slice(4, 6), 16);
    if (bw) {
        // http://stackoverflow.com/a/3943023/112731
        return (r * 0.299 + g * 0.587 + b * 0.114) > 186
            ? '#000000'
            : '#FFFFFF';
    }
    // invert color components
    r = (255 - r).toString(16);
    g = (255 - g).toString(16);
    b = (255 - b).toString(16);
    // pad each with zeros and return
    return "#" + padZero(r) + padZero(g) + padZero(b);
};

const deltaE = (color1, color2) => {
    let labA = rgb2lab(color1);
    let labB = rgb2lab(color2);
    let deltaL = labA[0] - labB[0];
    let deltaA = labA[1] - labB[1];
    let deltaB = labA[2] - labB[2];
    let c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
    let c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
    let deltaC = c1 - c2;
    let deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
    deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
    let sc = 1.0 + 0.045 * c1;
    let sh = 1.0 + 0.015 * c1;
    let deltaLKlsl = deltaL / (1.0);
    let deltaCkcsc = deltaC / (sc);
    let deltaHkhsh = deltaH / (sh);
    let i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
    return i < 0 ? 0 : Math.sqrt(i);
};

function rgb2lab(rgb){
    let r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255, x, y, z;
    r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
    y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
    z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
    return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
}

const convetImgToBase64AndSetColors = (imgUrl) => {
    fetch(imgUrl)
    .then(function(response) {
        return response.blob();
    }).then(function(myBlob) {
        const reader = new FileReader();
        reader.readAsDataURL(myBlob); 
        reader.onloadend = function() {
            const base64data = reader.result;
            getPredominantColor(base64data);
            }
    });
};

const getUrlParameter = (sParam) => {
    var sPageURL = window.location.search.substring(1),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return typeof sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
        }
    }
    return false;
};

const updateTimestampBar = (timestamp = currentTimestamp, progress = currentProgress) => {
    currentTimestamp = timestamp;
    currentProgress = progress;

    var per = parseInt((progress*100) / timestamp);
    elapsedTimestampEl.style.width = per + '%';
}

const getPredominantColor = async (image) => {
    const colors = await rgbaster(image);
	const predominantColor = colors[0].color;
	const rgb = predominantColor.replace('rgb(', '').replace(')', '').split(',');
	const [predominantR, predominantG, predominantB] = rgb;
	const vibrant = await Vibrant.from(image).getPalette();
	
    var accent = vibrant.Vibrant.hex;
    const accentRGB = hexToRgb(accent);

    // If accent color and predominante color (background) are too similar, accent color will receive black or white, based on contrast
    const dE = deltaE([predominantR, predominantG, predominantB], [accentRGB[0], accentRGB[1], accentRGB[2]]);
    accent = dE <= 2.2 ? invertColor(accent, true) : accent;

    // console.log(`${accentRGB[0]} ${accentRGB[1]} ${accentRGB[2]}`);
    // console.log(`${predominantR} ${predominantG} ${predominantB}`)
    // console.log(dE)

    trackEl.style.color = accent;
    artistEl.style.color = accent;
    overlay.style.backgroundColor = predominantColor;
    albumCoverGradientEl.style.background = `linear-gradient(to right, ${predominantColor} 3%, rgba(${predominantR}, ${predominantG}, ${predominantB}, 0))`;
    elapsedTimestampEl.style.backgroundColor = accent;
};

const refreshAccessToken = () => {
    $.ajax({
        type: 'POST',
        url: 'https://accounts.spotify.com/api/token',
        data: {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: client_id,
            client_secret: client_secret
        },
        success: function(data, textStatus, xhr) {
            if (!data) return;

            accessToken = data.access_token;
            refreshToken = data.refresh_token;
            tokenExpiresIn = data.expires_in;

            clearInterval(refreshAccessToken);
            window.setInterval(refreshAccessToken, tokenExpiresIn * 1000 - 30000);
        },
        dataType: 'json'
    });
}

const getCurrentPlayingTrack = () => {
    $.ajax({
        type: 'GET',
        url: 'https://api.spotify.com/v1/me/player/currently-playing?market=ES',
        headers: {
            'Authorization' : 'Bearer ' + accessToken
        },
        success: function(data, textStatus, xhr) {
            if (xhr.status == 401) refreshAccessToken();
            if (!data || !data.item) {
                return;
            }

            updateTimestampBar(data.item.duration_ms, data.progress_ms);
            overlay.style.display = 'flex';

            if (data.item.id == currentPlayingUUID) return;

            const albumCover = data.item.album.images[1].url;
            const track = data.item.name;
            const artist = data.item.artists[0].name;

            convetImgToBase64AndSetColors(albumCover);
            trackEl.innerHTML = track;
            artistEl.innerHTML = artist;
            albumCoverEl.style.background = 'url(' + albumCover + ')';
            albumCoverEl.style.backgroundSize = 'cover';

            currentPlayingUUID = data.item.id;
        },
        dataType: 'json'
    });
};

requestAuth().then(window.setInterval(getCurrentPlayingTrack, 5000));

window.setInterval(() => {
    currentProgress+=1000;
    updateTimestampBar();
}, 1000);