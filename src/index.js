//GLOBAL VARIABLES
window.historicalData = [];
window.aggregateData = [];
window.currentData = {};

const air_quality_sensor = (() => {
    // //PRIVATE VARIABLE

    let socket = new WebSocket('ws://' + window.location.host + '/ws');


    socket.timeoutInterval = 7500;

    var callbackOnReceiveCurrentData, callbackOnReceiveHistoricalData, callbackOnReceiveSettings, callbackOnOpen, callbackOnClose;
    var init = function (onReceiveCurrentData, onReceiveHistoricalData, onReceiveSettings, onOpen, onClose) {
        //CONNECT WITH THE BOARD VIA WEBSOCKETS
        callbackOnReceiveCurrentData = onReceiveCurrentData;
        callbackOnReceiveHistoricalData = onReceiveHistoricalData;
        callbackOnReceiveSettings = onReceiveSettings;
        callbackOnOpen = onOpen;
        callbackOnClose = onClose;
        socket.addEventListener("open", (event) => {

            if (typeof callbackOnOpen === 'function' && callbackOnOpen != undefined) {
                callbackOnOpen();
            }

        });
        socket.addEventListener('close', () => {

            if (typeof callbackOnOpen === 'function' && callbackOnClose != undefined) {
                callbackOnClose();
            }
            else {
                console.error('WebSocket connection closed');
            }
        });

        socket.addEventListener('error', (error) => {
            if (typeof callbackOnOpen === 'function' && callbackOnClose != undefined) {
                callbackOnClose();
            }
            else {
                console.error('WebSocket error:', error);
            }
        });
        socket.addEventListener("message", (event) => {
            var data;
            try {
                data = JSON.parse(event.data);
            } catch (e) {
                console.log("received", event.data);
                console.warn(e);
                return;
            }
            if (!data.hasOwnProperty("m")) {
                console.warn("JSON format not recognized");
                return;
            }
            if (data.m === "currentData") {
                //UPDATE INTERFACE
                window.currentData.aqi = AQIVal(data.v[1]);
                window.currentData.ppm1_0 = data.v[0];
                window.currentData.ppm2_5 = data.v[1];
                window.currentData.ppm10 = data.v[2];
                window.currentData.timestamp = data.v[5];
                processHistoricalData(data.v);

                callbackOnReceiveCurrentData();

            } else if (data.m === "historical") {
                processHistoricalData(data.v);
                callbackOnReceiveHistoricalData();
            }
            else if (data.m == "settings") {
                callbackOnReceiveSettings(data.v);

            }
        });
    }

    function processHistoricalData(data) {

        const result = data.reduce((acc, val, i) => {
            if (i % 6 === 0) {
                acc.push([val]);
            } else {
                acc[acc.length - 1].push(val);
            }
            return acc;
        }, []);

        const now = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 0, 1, 0);

        var keyDateTmp;
        var dayDateTmp;
        for (let element of result) {
            // Create a new Date instance with the UTC time
            const utcDate = new Date(0); // The 0 there is the key, which sets the date to the epoch
            utcDate.setUTCSeconds(element[5]);
            // Convert the UTC date to the local time zone
            keyDateTmp = new Date(utcDate.toLocaleString());

            dayDateTmp = new Date(keyDateTmp.getFullYear(), keyDateTmp.getMonth(), keyDateTmp.getDate(), 0, 1, 0);


            let dateDiffIndex = dateDiffInDays(dayDateTmp, now);
            if (dateDiffIndex > 30) {
                continue;
            }
            if (!window.historicalData[dateDiffIndex]) {
                window.historicalData[dateDiffIndex] = [];
            }

            let dataPoint = {
                timestamp: keyDateTmp,
                value: AQIVal(element[1]),
                ppm2_5: element[1],
                ppm10: element[2],
                ppm1_0: element[0]
            };

            window.historicalData[dateDiffIndex].push(dataPoint);

            if (window.aggregateData[dateDiffIndex] == undefined && dayDateTmp != undefined) {


                window.aggregateData[dateDiffIndex] = { timestamp: getDateString(keyDateTmp), date: keyDateTmp };
            }
        }
    }

    //communication settings
    const querySettings = () => {
        var message = {
            m: "querySettings",
            v: "payload"
        };
        if (socket.readyState === WebSocket.OPEN) {
            // Send the message as a JSON string
            socket.send(JSON.stringify(message));

        }
    };

    const setSettings = (frequencyReadTime, overallBrightness, timeLedOn, thresholdIndicator) => {

        var message = {
            m: "settingsUpdate",
            v: frequencyReadTime + "," + overallBrightness + "," + timeLedOn + "," + thresholdIndicator
        };

        if (socket.readyState === WebSocket.OPEN) {
            // Send the message as a JSON string
            socket.send(JSON.stringify(message));

        }

    }
    var playStartAnimation = () => {
        var message = {
            m: "playAnimation",
            v: "start"
        };
        socket.send(JSON.stringify(message));
    }
    var resetDefaultSettings = () => {
        var message = {
            m: "resetDefaults",
            v: "payload"
        };
        if (socket.readyState === WebSocket.OPEN) {
            // Send the message as a JSON string
            socket.send(JSON.stringify(message));
        }
    }
    var overrideCurrentAQI = (newValue) => {
        var message = {
            m: "overrideValue",
            v: newValue
        };
        if (socket.readyState === WebSocket.OPEN) {
            // Send the message as a JSON string
            socket.send(JSON.stringify(message));
        }
    }
    var syncTime = () => {
        var now = new Date();
        var hour = now.getHours();
        var min = now.getMinutes();
        var sec = now.getSeconds();
        var mday = now.getDate();
        var mon = now.getMonth() + 1; // months are zero-indexed, so add 1
        var year = now.getFullYear();
        var wday = now.getDay();


        var message = {
            m: "timeUpdate",
            v: hour + "," + min + "," + sec + "," + mday + "," + mon + "," + year + "," + wday
        };

        if (socket.readyState === WebSocket.OPEN) {
            // Send the message as a JSON string
            socket.send(JSON.stringify(message));
        }
    }
    //EXPORT PUBLIC VARIABLES
    return {
        init: init,
        setSettings: setSettings,
        querySettings: querySettings,
        debugOverrideCurrentAQI: overrideCurrentAQI,
        debugPlayStartAnimation: playStartAnimation,
        resetDefaultSettings: resetDefaultSettings,
        syncTime: syncTime,

    }

})();
/*************** TIME UTILS **********************/
function padLeftZero(inputNumber, desiredLength) {
    // Convert input number to a string
    const numberAsString = String(inputNumber);

    // Create an array with 'length' elements, each filled with the character '0'
    const leadingZeroes = Array(desiredLength).fill('0');

    // Combine the 'leadingZeroes' and 'numberAsString' using the concatenation operator (+)
    const paddedNumber = leadingZeroes.join('') + numberAsString;

    // Extract only the last 'desiredLength' digits of the 'paddedNumber' string
    return paddedNumber.slice(-desiredLength);
}
function hourMinuteSecondFromValue(value) {
    const hours = Math.floor(value * 24); // Multiply by the total number of hours in a day and get the floor value
    const minutesRemainder = ((value * 24) % 1) * 60; // Calculate the fractional part of an hour
    const minutes = Math.floor(minutesRemainder); // Get the floor value for minutes
    const secondsRemainder = (value * 24 * 60) % 60; // Calculate the fractional part of a minute
    const seconds = Math.round(secondsRemainder); // 

    return { hours, minutes, seconds };
}
function getDifferenceInSecondsToGMT() {
    let currentTime = new Date().getTime();

    // Get the current time in GMT 0
    let gmtTime = new Date().toUTCString();

    // Calculate the time difference in seconds
    let timeDifferenceInSeconds = (currentTime - Date.parse(gmtTime)) / 1000;

    console.log("The difference in seconds between your local time and GMT 0 is: " + timeDifferenceInSeconds + " seconds.");
    return timeDifferenceInSeconds;
}


const getTimezoneOffsetFromGMT = () => {
    console.log("difference:", getDifferenceInSecondsToGMT());
    console.log(Intl.DateTimeFormat().resolvedOptions().timeZone);
    var offset = new Date().getTimezoneOffset();
    console.log("offset", offset);
    return offset;
}

const toUnixTime = (year, month, day, hr, min, sec) => {
    const date = new Date(Date.UTC(year, month - 1, day, hr, min, sec));
    return Math.floor(date.getTime() / 1000);
}

function getTimeIndex(date) {
    // Get the hours, minutes, and seconds from the date
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    // Calculate the total minutes since midnight
    const totalMinutes = (hours * 60) + minutes + (seconds / 60);

    // Calculate the index based on 5-minute chunks (0-287)
    const index = Math.floor(totalMinutes / 5);

    return index;
}
function dateDiffInDays(a, b) {
    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

function getDateString(newDate) {

    var timestamp = "";
    try {
        // Get the day of the week
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = daysOfWeek[newDate.getDay()];

        // Get the month
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const month = monthNames[newDate.getMonth()];

        // Get the day of the month
        const day = newDate.getDate();

        // Get the ordinal suffix (st, nd, rd, th)
        const ordinalSuffix = getOrdinalSuffix(day);

        // Construct the timestamp string
        timestamp = `${dayOfWeek} ${month} ${day}${ordinalSuffix}`;
    }
    catch (e) {
        console.warn(e);
    }

    return timestamp;
}

// Helper function to get the ordinal suffix for a day
function getOrdinalSuffix(day) {
    const lastDigit = day % 10;
    const lastTwoDigits = day % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
        return 'th';
    } else if (lastDigit === 1) {
        return 'st';
    } else if (lastDigit === 2) {
        return 'nd';
    } else if (lastDigit === 3) {
        return 'rd';
    } else {
        return 'th';
    }
}
function fractionOfDay(date) {
    /**
     * Returns a float between 0 and 1 representing the fraction of the day
     * that has elapsed for the given date.
     *
     * @param {Date} date - A Date object representing the date and time.
     * @returns {number} A float between 0 and 1 representing the fraction of the day.
     */

    // Get the hour, minute, and second components of the input date
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();

    // Calculate the total number of seconds elapsed since midnight
    const totalSeconds = hour * 3600 + minute * 60 + second;

    // Calculate the fraction of the day by dividing the elapsed seconds
    // by the total number of seconds in a day (24 * 60 * 60)
    const fraction = totalSeconds / (24 * 3600);

    return fraction;
}
/*************** GRAPHIC UTILS **********************/
function createTexture(numbers) {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    canvas.width = 576;
    canvas.height = 40;

    // Get the 2D rendering context
    const ctx = canvas.getContext('2d');

    // Draw the stripes
    for (let i = 0; i < canvas.width; i += 2) {
        const x = i;
        const y = 0;
        const width = 2;
        const height = 40;
        const valueTmp = numbers[i];
        if (valueTmp == undefined) {
            ctx.fillStyle = `rgb(9,9,9)`;
            ctx.fillRect(x, y, width, height);
        }
        else {
            const color = interpolateColors(AQIVal(valueTmp) / 2.0);
            ctx.fillStyle = color;
            ctx.fillRect(x, y, width, height);
        }
    }

    // Return the canvas as an image data URL
    return canvas.toDataURL();
}
function interpolateColors(value) {
    if (value == 0) {
        value = 1.0;
    }
    // Define the 5 colors as RGB values
    const colors = [
        [1, 233, 0],   // Green
        [218, 200, 13], // Yellow
        [248, 112, 0],   // Orange
        [204, 0, 10],   // Red
        [217, 26, 137], // Magenta
        [126, 0, 35], // Maroon
    ];
    const extremes = [
        [0, 100],
        [101, 150],
        [151, 200],
        [201, 250],
        [251, 300],
        [301, 1000]
    ];
    if (value >= extremes[0][0] && value <= extremes[0][1]) {
        rVal = map(value, extremes[0][0], extremes[0][1], colors[0][0], colors[0][0]);
        gVal = map(value, extremes[0][0], extremes[0][1], colors[0][1], colors[0][1]);
        bVal = map(value, extremes[0][0], extremes[0][1], colors[0][2], colors[0][2]);

    } else if (value >= extremes[1][0] && value <= extremes[1][1]) {
        rVal = map(value, extremes[1][0], extremes[1][1], colors[0][0], colors[1][0]);
        gVal = map(value, extremes[1][0], extremes[1][1], colors[0][1], colors[1][1]);
        bVal = map(value, extremes[1][0], extremes[1][1], colors[0][2], colors[1][2]);

    } else if (value >= extremes[2][0] && value <= extremes[2][1]) {
        rVal = map(value, extremes[2][0], extremes[2][1], colors[1][0], colors[2][0]);
        gVal = map(value, extremes[2][0], extremes[2][1], colors[1][1], colors[2][1]);
        bVal = map(value, extremes[2][0], extremes[2][1], colors[1][2], colors[2][2]);

    } else if (value >= extremes[3][0] && value <= extremes[3][1]) {
        rVal = map(value, extremes[3][0], extremes[3][1], colors[2][0], colors[3][0]);
        gVal = map(value, extremes[3][0], extremes[3][1], colors[2][1], colors[3][1]);
        bVal = map(value, extremes[3][0], extremes[3][1], colors[2][2], colors[3][2]);;
    }
    else if (value >= extremes[4][0] && value <= extremes[4][1]) {
        rVal = map(value, extremes[4][0], extremes[4][1], colors[3][0], colors[4][0]);
        gVal = map(value, extremes[4][0], extremes[4][1], colors[3][1], colors[4][1]);
        bVal = map(value, extremes[4][0], extremes[4][1], colors[3][2], colors[4][2]);

    }
    else if (value > 300) {
        rVal = colors[5][0];
        gVal = colors[5][1];
        bVal = colors[5][2];
    }



    // Return the interpolated color as an RGB string
    return `rgb(${rVal}, ${gVal}, ${bVal})`;
}
function AQIVal(ppmVal) {
    let AQIvalue;

    ppmVal *= 10;

    if (ppmVal <= 120.0) {
        // 0-50 AQI | Green | Good
        AQIvalue = map(ppmVal, 0.0, 120.0, 0.0, 500.0);
    } else if (ppmVal > 120.0 && ppmVal <= 354.0) {
        // 51-100 AQI | Yellow | Moderate
        AQIvalue = map(ppmVal, 120.0, 354.0, 510.0, 1000.0);
    } else if (ppmVal > 354.0 && ppmVal <= 554.0) {
        // 101-150 AQI | Orange | Unhealthy for sensitive groups
        AQIvalue = map(ppmVal, 354.0, 554.0, 1010.0, 1500.0);
    } else if (ppmVal > 554.0 && ppmVal <= 1504.0) {
        // 151-200 AQI | Red | Unhealthy
        AQIvalue = map(ppmVal, 554.0, 1504.0, 1510.0, 2000.0);
    } else if (ppmVal > 1504.0 && ppmVal <= 2504.0) {
        // 201-300 AQI | Purple | Very Unhealthy
        AQIvalue = map(ppmVal, 1504.0, 2504.0, 2010.0, 3000.0);
    } else if (ppmVal > 2504.0 && ppmVal <= 3504.0) {
        // 301-400 AQI | Marone | Hazardous
        AQIvalue = map(ppmVal, 2504.0, 3504.0, 3010.0, 4000.0);
    } else if (ppmVal > 3504.0 && ppmVal <= 5000.0) {
        // 401-500 AQI | Marone | Hazardous
        AQIvalue = map(ppmVal, 3504.0, 5000.0, 4010.0, 5000.0);
    }

    AQIvalue /= 10.0;
    return Math.round(AQIvalue);
}

function map(value, fromLow, fromHigh, toLow, toHigh) {
    return ((value - fromLow) / (fromHigh - fromLow)) * (toHigh - toLow) + toLow;
}


/*************** INTERACTION HELPERS **********************/
const mouse = {
    x: 0,
    y: 0,
};

// Add event listeners for mouse movement
document.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

});

document.addEventListener("DOMContentLoaded", function () {
    //SETTINGS
    //INITIALIZE THE VARIABLES
    var settingsTimer = null; // Initialize a variable to store the timer ID

    const customReadTimeInput = document.getElementById('custom-read-time');
    const customReadTimeValue = document.getElementById('custom-read-time-value');


    const overallBrightnessInput = document.getElementById('overall-brightness');
    const overallBrightnessValue = document.getElementById('overall-brightness-value');

    const timeLEDOnInput = document.getElementById("time-led-on");
    const timeLEDOnValue = document.getElementById("time-led-on-value");

    const thresholdIndicatorInput = document.getElementById("threshold-indicator");
    const thresholdIndicatorValue = document.getElementById("threshold-indicator-value");

    var disconnectCounter = 0;

    var pilSettingsTimeout;

    let removeLoadingOverlay = () => {
        document.getElementById("loading").style.display = "none";
        DismissPil();

    }

    //INIT AIR QUALITY SENSOR
    var onCurrentDataReceived = () => {
        removeLoadingOverlay();
        const loadingElement = document.getElementById("loading");
        if (loadingElement) {
            if (loadingElement.style.display !== "none") {
                loadingElement.style.display = "none";
            }
        }
        document.querySelectorAll("#ppm10 .parameter-value")[0].innerHTML = "" + window.currentData.ppm10;
        document.querySelectorAll("#ppm2_5 .parameter-value")[0].innerHTML = "" + window.currentData.ppm2_5;
        document.querySelectorAll("#ppm1_0 .parameter-value")[0].innerHTML = "" + window.currentData.ppm1_0;
        document.querySelectorAll("#aqi .parameter-value")[0].innerHTML = "" + window.currentData.aqi;
        if (window.pJSDom && Array.isArray(window.pJSDom) && window.pJSDom.length > 0) {
            const pJS = window.pJSDom[0].pJS;
            if (pJS && pJS.particles && pJS.particles.number && typeof pJS.fn.particlesRefresh === 'function') {
                pJS.particles.number.value = map(window.currentData.aqi, 0, 200, 30, 5000);
                pJS.fn.particlesRefresh();
            }
        }
        visualizeData();

    }
    var onHistoricalDataReceived = () => {
        visualizeData();
        removeLoadingOverlay();

    }
    window.addEventListener("resize", () => {

        visualizeData();
    });

    var onReceiveSettings = (newSettings) => {
        if (newSettings.length >= 4) {

            var frequencyRead = newSettings[0] / (60 * 1000);
            customReadTimeInput.value = frequencyRead;
            customReadTimeValue.textContent = `${frequencyRead} minutes`;

            overallBrightnessInput.value = newSettings[1] * 100;
            overallBrightnessValue.textContent = `${overallBrightnessInput.value}%`;

            var timeLedOn = newSettings[2] / 1000;
            timeLEDOnInput.value = timeLedOn;
            timeLEDOnValue.textContent = `${timeLedOn} seconds `;

            thresholdIndicatorInput.value = newSettings[3];
            thresholdIndicatorValue.textContent = `${newSettings[3]} AQI`;
            enableControls();


        }
        window.clearTimeout(pilSettingsTimeout);
    }
    var onOpenSocket = () => {
        removeLoadingOverlay();
        disconnectCounter = 0;
    }
    var onCloseSocket = () => {
        if (disconnectCounter > 1) {
            ShowPil("Sensor unreachable");
        }
        disconnectCounter++;
    }

    air_quality_sensor.init(onCurrentDataReceived, onHistoricalDataReceived, onReceiveSettings, onOpenSocket, onCloseSocket);

    const feedbackBox = document.getElementById("settings-feedback-box");

    const checkIfSensorOnline = () => {
        window.setTimeout(() => {
            const displayValue = feedbackBox.style.display;
            if (displayValue.indexOf("none") == -1) {
                air_quality_sensor.querySettings();

                checkIfSensorOnline();

            }

        }, 2500);
    };
    checkIfSensorOnline();


    //BACKGROUND:
    particlesJS.load('particles-js', './particlesjs-config.json', function () {


    });


    /** ##TABS LOGIC */
    // TABS LOGIC
    // Get the tabs container and the tab content containers
    // JavaScript
    const tabsContainer = document.getElementById('tabs-container');
    const tabContents = document.querySelectorAll('.tab-content');
    const infoBtn = document.getElementById('info-btn');
    const closeBtn = document.getElementById('close-btn');

    infoBtn.addEventListener('click', () => {
        tabContents.forEach(tabContent => {
            tabContent.classList.remove('active');
        });
        initSettings();
        document.getElementById('tab2').classList.add('active');
    });

    closeBtn.addEventListener('click', () => {
        tabContents.forEach(tabContent => {
            tabContent.classList.remove('active');
        });

        document.getElementById('tab1').classList.add('active');
    });

    document.getElementById('tab1').classList.add('active');


    function visualizeData() {

        const container = document.getElementById('chart-container');
        container.innerHTML = ''; // Clear previous visualization

        // Assuming you have an array called historicalData
        var historicalDataIndexes = [];

        //get indexes
        for (let i = 0; i < window.historicalData.length; i++) {
            const day = window.historicalData[i];
            if (day) {
                historicalDataIndexes.push(i);
            }
        }

        // Find the minimum and maximum index
        const minIndex = Math.min(...historicalDataIndexes);
        const maxIndex = Math.max(...historicalDataIndexes);

        // Create a new array with all indices from minIndex to maxIndex
        const allIndices = Array.from({ length: maxIndex - minIndex + 1 }, (_, i) => i + minIndex);

        // Create an array of timestamps
        const today = new Date();
        const timestamps = allIndices.map((index) => {
            const date = new Date(today.getTime() - index * 24 * 60 * 60 * 1000);
            const options = { weekday: 'long', month: 'long', day: 'numeric' };
            const dateString = date.toLocaleDateString('en-US', options);
            return dateString;
        });



        for (let i = 0; i < timestamps.length; i++) {
            const day = window.historicalData[i];

            const dayContainer = document.createElement('div');
            dayContainer.classList.add('day-container');

            const dayLabel = document.createElement('div');
            dayLabel.classList.add('day-label');
            dayLabel.textContent = timestamps[i];

            const canvas = document.createElement('canvas');
            canvas.width = document.documentElement.clientWidth - 60;
            canvas.height = 50;
            const ctx = canvas.getContext('2d');
            // Set text content and position for labels
            const labels = ['3am', '6am', '9am', '12pm', '3pm', '6pm', '9pm'];
            const labelHeight = 20;
            const labelX = canvas.width / 2 - labelHeight / 2;
            const labelYStep = canvas.height / 12;

            // Set line thickness and color for markings
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#acacac55';

            // Clear the canvas before drawing
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw the background using a solid color
            ctx.fillStyle = '#dcdcdc55'; // Set the background color to light gray
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Calculate the distance between each marking based on the canvas height and the number of markings per day (12 * 2 = 24)
            const lineStep = canvas.height / 24;
            ctx.fillStyle = '#55555555'; // Set the background color to light gray
            // Use a loop to draw the markings and labels at the specified hours
            for (let i = 0; i < labels.length; i++) {

                const label = labels[i];

                const hour = parseInt(label);

                // if (hour > 6 && hour<6.1 || hour == 9 || hour == 12 || hour == 3 || hour == 6 || hour == 9) {
                // Draw the label at the specified position
                let xTmp = (canvas.width / (labels.length + 1)) * (i + 1);
                ctx.fillText(label, xTmp + 5, labelHeight - labelYStep);

                // Draw a line for the marking at the specified position
                ctx.beginPath();
                ctx.moveTo(xTmp, 0);
                ctx.lineTo(xTmp, canvas.height);
                ctx.stroke();
                // }
            }
            const y = 0;
            const width = canvas.width / 288;
            dayContainer.appendChild(canvas);
            dayContainer.appendChild(dayLabel);
            container.appendChild(dayContainer);
            dayContainer.style.opacity = '0.5';
            if (day) {
                dayContainer.style.opacity = '1.0';
                dayLabel.textContent = window.aggregateData[i].timestamp;
                for (let j = 0; j < day.length; j++) {
                    const dataPoint = day[j];
                    if (dataPoint) {
                        const x = fractionOfDay(dataPoint.timestamp) * (canvas.width - width);

                        const aqi = AQIVal(dataPoint.value);
                        const height = map(aqi, 0, 300, 3, canvas.height);
                        const color = interpolateColors(aqi);
                        ctx.fillStyle = color;
                        ctx.fillRect(x, canvas.height - height, width, height);

                    }
                }

                canvas.addEventListener('mousemove', showDataPointValue);
                canvas.addEventListener('mouseout', hideTooltip);
                canvas.setAttribute('data-day', "" + i);



            }
            const breakDiv = document.createElement('div');
            breakDiv.classList.add('break');
            container.appendChild(breakDiv);

        }


    }

    function showDataPointValue(e) {

        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasWidth = rect.width;

        // 1. Get the day index from the canvas parent element
        const dayIndex = canvas.getAttribute('data-day');
        const day = window.historicalData[dayIndex];

        if (!day) {
            hideTooltip();
            return;
        }

        // 2. Calculate the relative position in the day
        const relativePosition = canvasX / canvasWidth;
        var relativeHMS = hourMinuteSecondFromValue(relativePosition);
        var relativeDate = new Date(day[0].timestamp.getFullYear(), day[0].timestamp.getMonth(), day[0].timestamp.getDate(), relativeHMS.hours, relativeHMS.minutes, relativeHMS.seconds);

        // // 3. Find the closest data point
        var dataPoint;
        var minDiff = Infinity;
        for (let i = 0; i < day.length; i++) {
            const diffTmp = Math.abs(relativeDate.getTime() - day[i].timestamp.getTime());
            if (diffTmp >= 0 && diffTmp < 30 * 60 * 1000 && diffTmp < minDiff) { // Check if the difference is within 30 minutes
                dataPoint = day[i];
                minDiff = diffTmp;
            }
        }

        if (dataPoint == undefined) {
            hideTooltip();
            return;
        }
        var tooltip = document.getElementById("tooltip");

        // // 4. Update the tooltip content and position
        if (dataPoint) {
            tooltip.innerHTML = `<span class="tooltip-time">${padLeftZero(dataPoint.timestamp.getHours(), 2)}:${padLeftZero(dataPoint.timestamp.getMinutes(), 2)}</span> &#9; AQI: <span class="tooltip-val">${dataPoint.value}</span> <br>  ppm10: <span class="tooltip-val"> ${dataPoint.ppm10}</span> ppm2.5: <span class="tooltip-val">${dataPoint.ppm2_5}</span> ppm1.0: <span class="tooltip-val">${dataPoint.ppm1_0}</span>`;
        } else {
            tooltip.textContent = 'No data available for this time.';
        }
        if (window.innerWidth - e.clientX > tooltip.offsetWidth) {
            tooltip.style.left = `${e.clientX + 10}px`;

        }
        else {
            tooltip.style.left = `${e.clientX - (tooltip.offsetWidth + 10)}px`;
        }
        tooltip.style.top = `${e.clientY + 10}px`;
        tooltip.classList.add('visible');


    }

    function hideTooltip() {
        tooltip.classList.remove('visible');
    }

    const disableControls = () => {

        document.querySelectorAll('.setting-item input[type="range"], .setting-item button, .setting-item input[type = "checkbox"]').forEach(control => {
            control.classList.add('disabled');
            control.disabled = true; // Add a disabled attribute to the elements as well

        });
        document.querySelectorAll("label").forEach(label => {
            label.classList.add('grayedOut');
        });
        document.querySelectorAll(".control-value").forEach(control => {
            control.classList.add("grayedOut");
        });

    };
    disableControls();
    const enableControls = () => {
        // Set the display property to 'none'
        feedbackBox.style.display = "none";

        document.getElementById("settings-container").style.display = "block";

        document.querySelectorAll('.setting-item input, .setting-item input, button').forEach(control => {
            control.classList.remove('disabled');
            control.disabled = false; // Remove the disabled attribute from the elements
        });
        document.querySelectorAll("label").forEach(label => {
            label.classList.remove('grayedOut');
        });
        document.querySelectorAll(".control-value").forEach(control => {
            control.classList.remove("grayedOut");
        });

    };

    // Update custom read time value
    customReadTimeInput.addEventListener('input', function () {
        const minutes = parseInt(this.value, 10);
        customReadTimeValue.textContent = `${minutes} minutes`;
    });

    customReadTimeInput.addEventListener('change', () => {
        setTimeout(() => {
            updateSettings();
        }, 500);
    });

    //Update threshold indicator value
    thresholdIndicatorInput.addEventListener('input', function () {
        const thresholdPPm = parseInt(this.value, 10);
        thresholdIndicatorValue.textContent = `${thresholdPPm} AQI`;
    });
    thresholdIndicatorInput.addEventListener('change', () => {
        setTimeout(() => {
            updateSettings();
        }, 500);
    });


    // Update overall brightness value
    overallBrightnessInput.addEventListener('input', function () {
        const brightness = parseInt(this.value, 10);
        overallBrightnessValue.textContent = `${brightness}%`;
    });
    overallBrightnessInput.addEventListener('change', () => {
        setTimeout(() => {

            updateSettings();
        }, 500);
    });
    timeLEDOnInput.addEventListener('input', function () {
        const time = parseInt(this.value, 10);
        timeLEDOnValue.textContent = `${time} seconds `;
    });
    timeLEDOnInput.addEventListener('change', () => {
        setTimeout(() => {

            updateSettings();
        }, 500);
    });
    const initSettings = () => {
        air_quality_sensor.querySettings();
    };

    function ShowPil(message, type, dismissTime) {
        const pil = document.getElementById('pil');
        pil.textContent = message;
        pil.style.visibility = 'visible';
        pil.classList.add('animate-in');
        if (type == "OK") {
            pil.style.backgroundColor = "#8DC83E";
        }
        else if (type == "KO") {
            pil.style.backgroundColor = "#f59c32";
        }
        else {

            pil.style.backgroundColor = "#f59c32";
        }
        if (dismissTime != undefined) {
            window.setTimeout(() => {
                DismissPil();
            }, dismissTime);
        }
    }

    function DismissPil() {
        const pil = document.getElementById('pil');
        pil.classList.remove('animate-in');
        setTimeout(() => {
            pil.style.visibility = 'hidden';
        }, 2500); // wait for the transition to complete before hiding
    }



    const updateSettings = () => {
        var frequencyRead = (customReadTimeInput.value * 60 * 1000);

        var overallBrightness = overallBrightnessInput.value / 100.0;
        var timeLedOn = timeLEDOnInput.value * 1000;
        var thresholdIndicator = thresholdIndicatorInput.value - 0;
        disableControls();
        air_quality_sensor.setSettings(frequencyRead, overallBrightness, timeLedOn, thresholdIndicator);

        pilSettingsTimeout = setTimeout(() => {
            ShowPil("Sensor Unreachable");
            pilSettingsTimeout = null;
        }, 2000);

    }


    //RESET DEFAULS
    document.getElementById("reset-defaults").addEventListener("click", function (event) {
        air_quality_sensor.resetDefaultSettings();
        disableControls();
    });



    //HIDE ADVANCED SETTIGNS
    //SHOW ADVANCED SETTINGS
    const settingsBox = document.getElementById('active-settings');
    settingsBox.style.display = "none";
    var isShowingSettings = false;
    document.getElementById("button-advanced-settings").addEventListener("click", function () {
        if (isShowingSettings) {
            //change button label 
            document.getElementById("button-advanced-settings").textContent = "Show settings";
            const settingsBox = document.getElementById('active-settings');
            settingsBox.style.display = "none";
        }
        else {
            document.getElementById("button-advanced-settings").textContent = "Hide settings";
            const settingsBox = document.getElementById('active-settings');
            settingsBox.style.display = "";
        }
        isShowingSettings = !isShowingSettings;
    });




});