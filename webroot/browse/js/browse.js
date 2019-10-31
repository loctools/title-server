var dirData;

document.addEventListener('DOMContentLoaded', onDocumentLoad);
window.onhashchange = onWindowHashChange;

function onDocumentLoad() {
    console.log('onDocumentLoad()');

    var path;
    if (window.location.hash === '') {
        history.replaceState({}, '', '#/');
        path = '/';
    } else {
        path = window.location.hash.substr(1);
    }

    browseDirectory(path);
}

function onWindowHashChange() {
    console.log('onWindowHashChange()', window.location.hash);
    browseDirectory(window.location.hash.substr(1));
}

function browseDirectory(path) {
    document.title = path + ' — Title';

    var xhrUrl = '../xhr/browse' + path;
    console.log('Fetching', xhrUrl);

    var xhr = new XMLHttpRequest();
    xhr.addEventListener('load', function() {
        var data = this.responseText;

        dirData = {
            error: 'Failed to read directory contents',
            path: path
        };
        try {
            dirData = JSON.parse(data);
            console.log('Parsed response:', dirData);
        } catch (e) {
            console.log('Raw response:', data);
            console.log(e);
        }
        //console.log('dirData:', dirData);
        initPage();
    });
    xhr.open('GET', xhrUrl);
    xhr.send();
}

function initPage() {
    console.log('initList()');

    var path = dirData.path;

    renderBreadcrumbs(path);

    // render the directory entries

    scrollableListItems.innerText = '';

    if (dirData.error) {
        var outerDiv = document.createElement('div');
        outerDiv.id = 'scrollableListHeader';
        outerDiv.innerText = dirData.error;
        scrollableListItems.appendChild(outerDiv);
        adjustGeometry();
        return;
    }

    for (var i = 0; i < dirData.entries.length; i++) {
        var entry = dirData.entries[i];

        var outerDiv = document.createElement('div');

        var a = document.createElement('a');
        if (entry.dir) {
            a.href = '#' + path + entry.path + '/';
            a.className = 'folder';
        } else {
            a.href = '../view/#' + path + entry.path;
            a.className = 'file';
        }
        a.innerText = entry.name;
        outerDiv.appendChild(a);

        scrollableListItems.appendChild(outerDiv);
    }

    adjustGeometry();
}

function renderBreadcrumbs(path) {
    breadcrumbs.innerText = '';

    var a = document.createElement('a');
    a.href = '#/';
    a.innerText = 'Home';
    a.className = 'home';
    breadcrumbs.appendChild(a);

    var parts = path.split('/');
    var relPath = '/';
    parts.forEach(el => {
        if (el === '') {
            return;
        }
        relPath += el + '/';
        var a = document.createElement('a');
        a.href = '#' + relPath;
        a.innerText = el;
        breadcrumbs.appendChild(a);
    });
}

function adjustGeometry() {
    adjustScrollableListGeometry();
}
