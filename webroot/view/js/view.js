var hashPath;
var hashQuery;

var videoLoaded = false;
var wasInitialized = false;

var parsedMetadataFile;
var parsedLocjsonFile;

var timeline = [];
var lastTimelineIdx = -1;

var highlightedCues = {};
var minHighlightedCueIdx = -1;

var currentCueIndex = -1;
var lastSelectedCueIndex = -1;
var loopStart = -1;
var loopEnd = -1;
var adjustedVideoDuration = -1;
var isEmptyVideo = false;

var videoPlaybackMonitorTimer;

// add extra small value to make sure we go to the actual cue
// we clicked on, and not to the upper one, when upper one
// ends at the same time as the next one begins.
const TINY_TIME_OFFSET = 0.00001;

document.addEventListener('DOMContentLoaded', onDocumentLoad);
document.addEventListener('keydown', onDocumentKeydown);
document.addEventListener('mousemove', onDocumentMouseMove);

function onDocumentLoad() {
    console.log('onDocumentLoad()');

    if (window.location.hash === '') {
        console.warn('Path not provided');
    } else {
        hashPath = window.location.hash.substr(1);
        var parts = hashPath.split('?');
        hashPath = parts.shift();
        hashQuery = parseQueryParams(parts.join('?'));
        console.log('hashQuery:', hashQuery);

        loadUrl('../xhr/view' + hashPath, processViewDataXHRResponse);
        renderBreadcrumbs(hashPath);
        document.title = hashPath + ' — Title';
    }
}

function updateHighlightInfoInUrl() {
    console.log('updateHighlightInfoInUrl()', 'highlightedCues:', highlightedCues);
    parts = [];
    begin = -1;
    end = -1;
    for (var i in highlightedCues) {
        i *= 1; // convert to a number
        if (begin === -1) {
            begin = i;
            end = i;
            continue;
        }
        if (i === end + 1) {
            end = i;
            continue;
        }
        if (begin === end) {
            parts.push(begin + 1);
        } else {
            parts.push([begin + 1, end + 1].join('-'));
        }
        begin = i;
        end = i;
    }
    console.log('after loop:', 'begin:', begin, 'end:', end);
    if (begin !== -1) {
        if (begin === end) {
            parts.push(begin + 1);
        } else {
            parts.push([begin + 1, end + 1].join('-'));
        }
    }
    var s = parts.join(';');
    console.log('hl=' + s);

    if (s === '') {
        delete hashQuery.hl;
    } else {
        hashQuery.hl = s;
    }

    updateHash();
}

function updateHash() {
    var q = buildQueryParams(hashQuery);
    window.location.hash = q === '' ? hashPath : hashPath + '?' + q;
}

function renderBreadcrumbs(path) {
    breadcrumbs.innerText = '';

    var a = document.createElement('a');
    a.href = '../browse/#/';
    a.innerText = 'Home';
    a.className = 'home';
    breadcrumbs.appendChild(a);

    var parts = path.split('/');
    var lastItem = parts.splice(-1, 1);
    var relPath = '/';
    parts.forEach(el => {
        if (el === '') {
            return;
        }
        relPath += el + '/';
        var a = document.createElement('a');
        a.href = '../browse/#' + relPath;
        a.innerText = el;
        breadcrumbs.appendChild(a);
    });

    var span = document.createElement('span');
    span.innerText = lastItem;
    breadcrumbs.appendChild(span);
}

function processViewDataXHRResponse() {
    var data = this.responseText;

    if (data === '') {
        console.warn('Empty response received');
        return;
    }

    var videoInfo = {};
    try {
        videoInfo = JSON.parse(data);
        console.debug('Parsed response:', videoInfo);
    } catch (e) {
        console.warn('Raw response:', data);
        console.warn(e);
        return;
    }

    loadUrl(videoInfo.metadataUrl, processMetadataXHRResponse);
    loadUrl(videoInfo.locjsonUrl, processLocJSONXHRResponse);

    if (!videoInfo.renewUrl) {
        console.log('Setting an empty video');
        isEmptyVideo = true;
        setVideoUrl('img/empty.mp4');
        document.body.classList.add('emptyvideo');
        return;
    }

    loadVideo(videoInfo.platform, videoInfo.videoId, videoInfo.renewUrl);
}

function loadUrl(xhrUrl, callback) {
    console.log('Fetching', xhrUrl);

    var xhr = new XMLHttpRequest();
    xhr.addEventListener('load', callback);
    xhr.open('GET', xhrUrl);
    xhr.send();
}

function processMetadataXHRResponse() {
    var data = this.responseText;

    if (data === '') {
        console.warn('Empty response received');
        return;
    }

    try {
        parsedMetadataFile = JSON.parse(data);
        //console.debug('Parsed metadata:', parsedMetadataFile);
    } catch (e) {
        console.warn('Raw response:', data);
        console.warn(e);
        return;
    }

    checkIfDataLoadedAndInitCues();
}

function processLocJSONXHRResponse(xhrUrl) {
    var data = this.responseText;

    if (data === '') {
        console.warn('Empty response received');
        return;
    }

    try {
        parsedLocjsonFile = JSON.parse(data);
        //console.debug('Parsed LocJSON:', parsedLocjsonFile);
    } catch (e) {
        console.warn('Raw response:', data);
        console.warn(e);
        return;
    }

    checkIfDataLoadedAndInitCues();
}

function loadVideo(platform, videoId, renewUrl) {
    var key = 'streamInfo:' + platform + ':' + videoId;

    try {
        var streamInfo = JSON.parse(window.localStorage.getItem(key));
        console.log('streamInfo:', streamInfo);

        var now = Math.round(new Date().getTime() / 1000);

        if (streamInfo && streamInfo.expires && streamInfo.expires > now) {
            // use an existing stream URL
            console.log('Reusing an existing stream URL');
            setVideoUrl(streamInfo.url);
            return;
        }
    } catch (e) {
        console.warn(e);
    }

    // getting the new stream info

    console.log('Fetching', renewUrl);

    var xhr = new XMLHttpRequest();
    xhr.addEventListener('load', function() {
        var data = this.responseText;

        if (data === '') {
            console.warn('Empty response received');
            return;
        }

        try {
            var streamInfo = JSON.parse(data);
            console.debug('Parsed response:', streamInfo);
            window.localStorage.setItem(key, data);
            setVideoUrl(streamInfo.url);
        } catch (e) {
            console.warn('Raw response:', data);
            console.warn(e);
        }
    });
    xhr.open('GET', renewUrl);
    xhr.send();
}

function setVideoUrl(url) {
    video.src = url;
    console.log('Requested the video to load');
    video.load();
}

function updateVideoPositionTimestamp() {
    timeStamp.innerText = formatTimestamp(video.currentTime);
}

function updateVideoPositionLine() {
    if (video.textTracks.length === 0) {
        return;
    }
    var cues = video.textTracks[0].cues;
    var t = video.currentTime;

    var seekStartIdx = 0;
    if (lastSelectedCueIndex > -1) {
        seekStartIdx = cues[lastSelectedCueIndex].__timelineIdx;
    }
    if (t < cues[0].startTime) {
        seekStartIdx = 0;
    }

    for (var i = seekStartIdx; i < timeline.length; i++) {
        var ti = timeline[i];
        if (ti.from <= t && ti.till >= t) {
            if (lastTimelineIdx != i) {
                if (ti.fromDiv) {
                    ti.fromY = ti.fromDiv.offsetTop;
                } else {
                    ti.fromY = 0;
                }

                if (ti.tillDiv) {
                    ti.tillY = ti.tillDiv.offsetTop;
                } else {
                    ti.tillY = scrollableList.scrollHeight;
                }
            }

            var relPos = (t - ti.from) / (ti.till - ti.from);
            var y = Math.round(relPos * (ti.tillY - ti.fromY) + ti.fromY);

            videoPositionLine.style.top = y + 'px';
            scrollableList.scrollTop = y - 120; // to see one previous cue above + a bit extra

            lastTimelineIdx = i;
            return;
        }
    }
}

function requestUIUpdate() {
    window.requestAnimationFrame(updateUI);
}

function updateUI() {
    updateVideoPositionTimestamp();
    updateVideoPositionLine();
}

video.addEventListener('loadeddata', function() {
    console.log('video.loadeddata');
    videoLoaded = true;
    requestUIUpdate();
    checkIfDataLoadedAndInitCues();
});

function checkIfDataLoadedAndInitCues() {
    if (videoLoaded && parsedLocjsonFile && parsedMetadataFile && !wasInitialized) {
        buildCues();
        initCues();
        buildTimeline();
        initializeVideoPosition();
    }
}

function initializeVideoPosition() {
    if (hashQuery['st'] !== undefined) {
        disableMouseHover();
        video.currentTime = hashQuery['st'];
    } else if (minHighlightedCueIdx > -1) {
        disableMouseHover();
        gotoCue(minHighlightedCueIdx);
    } else {
        // just update the UI
        // to select the active cue, if any
        textTrackCueChange();
    }
}

video.addEventListener('timeupdate', videoPlaybackMonitor, true);

video.addEventListener(
    'pause',
    function(e) {
        document.body.classList.remove('isPlaying');
    },
    true
);

video.addEventListener(
    'play',
    function(e) {
        document.body.classList.add('isPlaying');
    },
    true
);

function play() {
    if (!video.paused) {
        return;
    }

    videoPlaybackMonitorTimer = setInterval(videoPlaybackMonitor, 20);

    var promise = video.play();

    console.log('Playback requested');

    if (promise !== undefined) {
        promise
            .then(_ => {
                console.log('Playback started');
            })
            .catch(error => {
                console.log('Playback failed');
                console.error(error);
            });
    }
}

function pause() {
    if (video.paused) {
        return;
    }

    console.log('Video paused');

    clearInterval(videoPlaybackMonitorTimer);
    video.pause();
}

var lastUIVideoPosition = -1;
function videoPlaybackMonitor() {
    var t = video.currentTime;
    if (t === lastUIVideoPosition) {
        return;
    }

    requestUIUpdate();
    lastUIVideoPosition = t;

    if (video.paused) {
        return;
    }

    if (isEmptyVideo && t > adjustedVideoDuration) {
        pause();
        video.currentTime = adjustedVideoDuration;
        return;
    }

    if (loopEnd > -1 && t >= loopEnd) {
        pause();
        video.currentTime = loopStart + TINY_TIME_OFFSET;
        console.log('video position monitor: resetting loop start/end positions');
        loopStart = loopEnd = -1;
    }
}

playPause.addEventListener('click', togglePlayPause);

function togglePlayPause() {
    if (video.paused) {
        play();
    } else {
        pause();
    }
}

function parseHighlightInfo(maxCues) {
    minHighlightedCueIdx = -1;

    highlightedCues = {};
    if (hashQuery['hl'] === undefined) {
        return;
    }

    hashQuery['hl'].split(';').forEach(range => {
        var parts = range.split('-');
        var start = parts[0];
        var end = parts.length == 1 ? parts[0] : parts[1];
        if (start < 1 || start > end || start > maxCues || end > maxCues) {
            return;
        }

        for (var i = start; i <= end; i++) {
            highlightedCues[i - 1] = true;

            if (minHighlightedCueIdx === -1 || i < minHighlightedCueIdx) {
                minHighlightedCueIdx = i - 1;
            }
        }
    });
    console.log('highlightedCues:', highlightedCues);
}

function updateSpeedLabel(cue, div) {
    // calculate speed in chars per second
    var duration = cue.endTime - cue.startTime;
    var speed = cue.text.length / duration;
    var normalSpeed = 20; // chars per second
    var relSpeed = speed / normalSpeed; // < 1 = slower; > 1 = faster than norm
    var minSpeed = 0.5;
    var maxSpeed = 2;
    // trim to [minSpeed, maxSpeed]
    if (relSpeed < minSpeed) {
        relSpeed = minSpeed;
    }
    if (relSpeed > maxSpeed) {
        relSpeed = maxSpeed;
    }

    // if the absolute time cue is shown is less
    // than a second, map the maximum speed
    // as a function between
    if (duration < 1) {
        if (duration <= 0.5) {
            relSpeed = maxSpeed;
        } else {
            // map (0.5..1] (duration) to (2..1.5) (rel. speed)
            relSpeed = 2.5 - duration;
        }
    }

    // convert ta value of hue:
    // [minSpeed..1] => 255-127 (blue to green)
    // (1..maxSpeed] => 127-0 (green to red)
    var hue;
    if (relSpeed <= 1) {
        // [0.5..1]
        hue = 1 - relSpeed; // [0.5..0]
        hue += minSpeed; // [1..0.5]
        hue = Math.round(hue * 255); // [255..127]
    } else {
        // (1..2]
        hue = 2 - relSpeed; // (1..0]
        hue = Math.round(hue * 127); // (127..0]
    }
    var hsl = 'hsl(' + hue + ', 100%, 50%)';

    div.style.background = hsl;
    div.innerText = Math.round(speed) + 'cps';
}

function buildCues() {
    console.log('buildCues()');

    var cueText = [];
    for (var i = 0; i < parsedLocjsonFile.units.length; i++) {
        var src = parsedLocjsonFile.units[i].source.join('').split('\n\n');
        cueText.push(...src);
    }

    if (cueText.length != parsedMetadataFile.length) {
        console.warn("LocJSON doesn't align with metadata. Check the localizations");
        return;
    }

    var track = video.addTextTrack('subtitles');

    for (var i = 0; i < parsedMetadataFile.length; i++) {
        var meta = parsedMetadataFile[i];
        var cue = new VTTCue(meta.from / 1000, meta.till / 1000, cueText[i]);
        track.addCue(cue);
    }

    track.mode = 'showing';
}

function initCues() {
    console.log('initCues()');
    wasInitialized = true;
    var textTrack = video.textTracks[0];
    textTrack.addEventListener('cuechange', textTrackCueChange);

    // now that we know the total length of the cues list,
    // parse the highlighting info

    parseHighlightInfo(textTrack.cues.length);

    // add index back to each cue object
    // for cross-referencing

    for (var i = 0; i < textTrack.cues.length; i++) {
        textTrack.cues[i].__index = i;
    }

    // render the cues

    scrollableListItems.innerText = '';

    for (var i = 0; i < textTrack.cues.length; i++) {
        var cue = textTrack.cues[i];

        var outerDiv = document.createElement('div');
        cue.__outerDiv = outerDiv;

        var div = document.createElement('div');
        div.className = 'startTime';
        div.innerText = formatTimestamp(cue.startTime);
        outerDiv.appendChild(div);
        cue.__startDiv = div;

        var div = document.createElement('div');
        div.className = 'endTime';
        div.innerText = formatTimestamp(cue.endTime);
        outerDiv.appendChild(div);
        cue.__endDiv = div;

        var div = document.createElement('div');
        div.className = 'speed';
        updateSpeedLabel(cue, div);
        outerDiv.appendChild(div);
        cue.__speedDiv = div;

        var div = document.createElement('div');
        div.className = 'cue';
        div.innerText = cue.text;
        outerDiv.appendChild(div);

        scrollableListItems.appendChild(outerDiv);

        outerDiv.__index = i;

        if (highlightedCues[i]) {
            outerDiv.classList.add('highlighted');
        }

        outerDiv.addEventListener('click', onCueMouseClick);
    }

    adjustGeometry();

    adjustedVideoDuration = video.duration;
    if (isEmptyVideo) {
        var lastIdx = textTrack.cues.length - 1;
        adjustedVideoDuration = textTrack.cues[lastIdx].endTime + 1; // 1 second past last cue
    }

    videoLength.innerText = formatTimestamp(adjustedVideoDuration);
}

function buildTimeline() {
    timeline = [];

    var textTrack = video.textTracks[0];
    var timelineIdx = -1;

    var firstCue = textTrack.cues[0];
    var lastCue = textTrack.cues[textTrack.cues.length - 1];
    var cuesStart = firstCue.startTime;

    if (cuesStart > 0) {
        timeline[++timelineIdx] = {
            from: 0,
            till: cuesStart,
            fromDiv: null,
            tillDiv: firstCue.__outerDiv
        };
    }

    for (var i = 0; i < textTrack.cues.length - 1; i++) {
        cue = textTrack.cues[i];
        nextCue = textTrack.cues[i + 1];
        timeline[++timelineIdx] = {
            from: cue.startTime,
            till: nextCue.startTime,
            fromDiv: cue.__outerDiv,
            tillDiv: nextCue.__outerDiv
        };
        // add reference from the cue to the timeline index
        // for easier seeking
        cue.__timelineIdx = timelineIdx;
    }

    timeline[++timelineIdx] = {
        from: lastCue.startTime,
        till: lastCue.endTime,
        fromDiv: lastCue.__outerDiv,
        tillDiv: scrollableListFooter
    };
    lastCue.__timelineIdx = timelineIdx;

    if (lastCue.endTime < adjustedVideoDuration) {
        timeline[++timelineIdx] = {
            from: lastCue.endTime,
            till: adjustedVideoDuration,
            fromDiv: scrollableListFooter,
            tillDiv: null
        };
    }
}

function adjustGeometry() {
    adjustScrollableListGeometry();

    // adjust the height of the list footer
    // to allow to scroll up to the last cue only

    var h = scrollableListContainer.offsetHeight - scrollableListItems.lastChild.offsetHeight;
    scrollableListFooter.style.height = h + 'px';
}

function selectCueByIndex(index) {
    if (currentCueIndex != -1) {
        var div = scrollableListItems.children[currentCueIndex];
        div.classList.remove('selected');
        currentCueIndex = -1;
    }

    if (index === -1) {
        return;
    }

    var div = scrollableListItems.children[index];
    disableMouseHover();

    div.classList.add('selected');

    currentCueIndex = index;
    lastSelectedCueIndex = index;
}

function gotoCue(index) {
    var textTrack = video.textTracks[0];
    var cue = textTrack.cues[index];
    video.currentTime = cue.startTime + TINY_TIME_OFFSET;
}

function textTrackCueChange() {
    var textTrack = video.textTracks[0];
    var cue = textTrack.activeCues[0];
    var idx = cue ? cue.__index : -1;

    console.log('textTrackCueChange()', 'idx:', idx, 'video.currentTime:', video.currentTime);

    selectCueByIndex(idx);
}

function onCueMouseClick(e) {
    console.log('onCueMouseClick()', 'metaKey:', e.metaKey);

    var textTrack = video.textTracks[0];
    var cue = textTrack.cues[this.__index];

    if (e.metaKey) {
        var prevState = highlightedCues[this.__index];

        // if Shift key is also pressed, remove all the previous selection,
        // unless we already have just one item that needs to be toggled
        if (!e.shiftKey && Object.keys(highlightedCues).length > 0) {
            for (var i in highlightedCues) {
                i *= 1; // convert to a number
                if (i === this.__index) {
                    continue;
                }
                textTrack.cues[i].__outerDiv.classList.remove('highlighted');
            }
            highlightedCues = [];
        }
        e.preventDefault();

        if (prevState) {
            delete highlightedCues[this.__index];
        } else {
            highlightedCues[this.__index] = true;
        }
        updateHighlightInfoInUrl();
        this.classList.toggle('highlighted', highlightedCues[this.__index]);

        return;
    }

    loopStart = -1;
    loopEnd = -1;
    console.log('onCueMouseClick(): resetting loop start/end positions');
    console.log('cue.startTime:', cue.startTime);
    video.currentTime = cue.startTime + 0.001;
}

function parseTime(t) {
    var h = 0;
    var m = 0;
    var s = Math.floor(t);
    var ms = Math.floor(t * 1000) % 1000;
    if (s > 60) {
        m = Math.floor(s / 60);
        s = s % 60;
    }
    if (m > 60) {
        h = Math.floor(m / 60);
        m = m % 60;
    }

    return { h, m, s, ms };
}

function formatFullTimestampParts({ h, m, s, ms }) {
    h = h < 10 ? '0' + h : h;
    m = m < 10 ? '0' + m : m;
    s = s < 10 ? '0' + s : s;
    ms = ms < 10 ? '00' + ms : ms < 100 ? '0' + ms : ms;
    return h + ':' + m + ':' + s + '.' + ms;
}

function formatShortTimestampParts({ h, m, s, ms }) {
    h = h < 10 ? '0' + h : h;
    m = m < 10 ? '0' + m : m;
    s = s < 10 ? '0' + s : s;
    ms = ms < 10 ? '00' + ms : ms < 100 ? '0' + ms : ms;

    if (h === '00') {
        return m + ':' + s + '.' + ms;
    }
    return h + ':' + m + ':' + s + '.' + ms;
}

function formatTimestamp(t) {
    return formatShortTimestampParts(parseTime(t));
}

function onDocumentKeydown(e) {
    if (processKeydownEvent(e)) {
        e.preventDefault();
    }
}

function processKeydownEvent(e) {
    console.warn(e);

    loopStart = -1;
    loopEnd = -1;
    console.log('processKeydownEvent(): resetting loop start/end positions');

    disableMouseHover();

    var textTrack = video.textTracks[0];
    var cue = currentCueIndex > -1 ? textTrack.cues[currentCueIndex] : undefined;

    if (e.code === 'ArrowLeft') {
        if (e.altKey) {
            video.currentTime -= 0.1;
            return true;
        }
        if (e.shiftKey) {
            video.currentTime -= 10;
            return true;
        }
        video.currentTime -= 1;
        return true;
    }
    if (e.code === 'ArrowRight') {
        if (e.altKey) {
            video.currentTime += 0.1;
            return true;
        }
        if (e.shiftKey) {
            video.currentTime += 10;
            return true;
        }
        video.currentTime += 1;
        return true;
    }
    if (e.code === 'ArrowUp') {
        if (cue && video.currentTime - TINY_TIME_OFFSET > cue.startTime + 0.5) {
            gotoCue(currentCueIndex);
            return true;
        }
        if (lastSelectedCueIndex > 0) {
            gotoCue(lastSelectedCueIndex - 1);
        }
        return true;
    }
    if (e.code === 'ArrowDown') {
        if (lastSelectedCueIndex < textTrack.cues.length - 1) {
            gotoCue(lastSelectedCueIndex + 1);
        }
        return true;
    }
    if (e.code === 'Space') {
        togglePlayPause();
        return true;
    }
    if (e.code === 'Escape') {
        if (!video.paused) {
            pause();
        }
        return true;
    }

    if (e.code === 'Enter') {
        if (currentCueIndex === -1) {
            currentCueIndex = 0;
            cue = textTrack.cues[currentCueIndex];
        }
        loopStart = cue.startTime;
        loopEnd = cue.endTime;
        console.log('loopEnd:', loopEnd);
        // unless Shift+Enter is pressed,
        // extend the loop end to the last
        // highlighted in the series
        if (!e.shiftKey) {
            for (var i = currentCueIndex; i < textTrack.cues.length; i++) {
                if (!highlightedCues[i]) {
                    break;
                }
                loopEnd = textTrack.cues[i].endTime;
                console.log('extending loopEnd to', loopEnd);
            }
        }
        gotoCue(currentCueIndex);
        play();
        return true;
    }

    // all rules below work only when there's
    // a cue selected

    if (currentCueIndex === -1) {
        return false;
    }

    // edit mode keys

    if (e.code === 'KeyQ') {
        cue.startTime -= 0.1;
        cue.__startDiv.innerText = formatTimestamp(cue.startTime);
        updateSpeedLabel(cue, cue.__speedDiv);
        return true;
    }

    if (e.code === 'KeyW') {
        cue.startTime += 0.1;
        cue.__startDiv.innerText = formatTimestamp(cue.startTime);
        updateSpeedLabel(cue, cue.__speedDiv);
        return true;
    }

    if (e.code === 'KeyZ') {
        cue.endTime -= 0.1;
        cue.__endDiv.innerText = formatTimestamp(cue.endTime);
        updateSpeedLabel(cue, cue.__speedDiv);
        return true;
    }

    if (e.code === 'KeyX') {
        cue.endTime += 0.1;
        cue.__endDiv.innerText = formatTimestamp(cue.endTime);
        updateSpeedLabel(cue, cue.__speedDiv);
        return true;
    }

    return false;
}

var isNoHoverMode = false;

function disableMouseHover() {
    if (isNoHoverMode) {
        return;
    }
    console.log('disableMouseHover()');
    isNoHoverMode = true;
    document.body.classList.add('noHover');
}

function enableMouseHover() {
    if (!isNoHoverMode) {
        return;
    }
    isNoHoverMode = false;
    console.log('enableMouseHover()');
    document.body.classList.remove('noHover');
}

function onDocumentMouseMove() {
    if (isNoHoverMode) {
        enableMouseHover();
    }
}