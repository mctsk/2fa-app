const fs = require('fs')
const os = require('os')
const { TOTP } = require('totp-generator')
const bootstrap = require('bootstrap')
const Sortable = require('sortablejs')
const storage = require('electron-json-storage');


storage.setDataPath(os.homedir());

const dataPath = storage.getDataPath();
const path = require('path')


const filePath = path.join(__dirname, 'data.json')
let allData = {}

var remainSeconds = 0;
var deleteModal;
var addModal;
var sortable;
var snackbar;

document.addEventListener('DOMContentLoaded', function () {
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'))
    addModal = new bootstrap.Modal(document.getElementById('addNewModal'))


    var el = document.getElementById('sortable');
    var options = {
        group: 'share',
        animation: 100
    };

    events = [
        'onEnd',
    ].forEach(function (name) {
        options[name] = function (evt) {

            var itemList = document.querySelectorAll(".row-2fa")

            var queueList = [];
            itemList.forEach((x, i) => {
                queueList.push(x.getAttribute("dataid")
                )
            })

            queueList.forEach((item, i) => {
                var entry = allData.entries.find(x => { return x.id == item });
                entry.queue = i;
            });

            // writeData();
            setStorage()
        };
    });

    sortable = Sortable.create(el, options);


}, false);



function getStorage() {
    storage.get('userData', function (error, data) {
        if (error) throw error;

        const response = data
        // handle the json data here
        $(".twofa-list").html("");

        allData = response;

        response?.entries?.sort((a, b) => a.queue - b.queue).map((x) => {

            const key = x.info.secret

            var time = new Date();

            var t1 = time.getTime()

            const { otp, expires } = TOTP.generate(key, {
                digits: x.info.digits,
                period: x.info.period,
                timestamp: time.getTime(),
            })

            var dif = t1 - expires;
            remainSeconds = Math.round(dif / 1000) * -1;

            $(".twofa-list").append(`
                <li class="row row-2fa" dataid="${x.id}">
                    <div class="col-9">
                        <label class="title">${x.name}</label>
                        <label class="code">${otp}</label>
                    </div>
                    <div class="col-1 time-wrapper">
                        <div class="time">${remainSeconds}</div>
                    </div>
                    <div class="col-1">
                        <a href="#" class="delete" dataid="${x.id}" data-bs-toggle="modal" data-bs-target=".delete-modal">Sil</a>
                    </div>
                </div>
                `)
        })
    });
}

function setStorage() {
    storage.set('userData', allData, function (error) {
        if (error) throw error;

        addModal.hide();
        $("#addNewModal").find("input").val("");

        deleteModal.hide();

        getStorage();
    });
}

function writeData() {
    var newdata = JSON.stringify(allData);
    fs.writeFile(filePath,
        newdata,
        {
            encoding: "utf8",
            flag: "w",
            mode: 0o666
        }
        , (err, newdata) => {

            addModal.hide();
            $("#addNewModal").find("input").val("");

            deleteModal.hide();

            if (err) {
                console.error(err);
                return;
            }
            else {
                // readData()
                getStorage();
            }
        })
}

function readData() {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return;
        }
        const response = JSON.parse(data)
        // handle the json data here
        $(".twofa-list").html("");

        allData = response;

        response.entries.sort((a, b) => a.queue - b.queue).map((x) => {

            const key = x.info.secret

            var time = new Date();

            var t1 = time.getTime()

            const { otp, expires } = TOTP.generate(key, {
                digits: x.info.digits,
                period: x.info.period,
                timestamp: time.getTime(),
            })

            var dif = t1 - expires;
            remainSeconds = Math.round(dif / 1000) * -1;

            $(".twofa-list").append(`
                <li class="row row-2fa" dataid="${x.id}">
                    <div class="col-9">
                        <label class="title">${x.name}</label>
                        <label class="code">${otp}</label>
                    </div>
                    <div class="col-1 time-wrapper">
                        <div class="time">${remainSeconds}</div>
                    </div>
                    <div class="col-1">
                        <a href="#" class="delete" dataid="${x.id}" data-bs-toggle="modal" data-bs-target=".delete-modal">Sil</a>
                    </div>
                </div>
                `)
        })

    });
}

function toast() {
    snackbar.className = "show";
    setTimeout(function () { snackbar.className = snackbar.className.replace("show", ""); }, 1500);
}

$(document).ready(function () {

    snackbar = document.getElementById("toast");

    setInterval(function () {
        if (remainSeconds < 2) {
            $(".time").html("");
            // readData()
            getStorage();
        }
        else {
            remainSeconds--;
            $(".time").html(remainSeconds);
        }

    }, 1000)

    $(document).delegate(".row-2fa", "click", function (e) {
        var target = e.currentTarget;
        var value = $(target).find(".code").html();
        navigator.clipboard.writeText(value);
        toast();
    })

    $(document).delegate(".delete", "click", function (e) {
        var target = e.currentTarget;
        var value = $(target).attr("dataid")
        $("#deleteModal").attr("dataid", value)
        deleteModal.show();
    })

    $(document).delegate(".addnew", "click", function (e) {
        addModal.show();
    })

    $(document).delegate(".save-btn", "click", function (e) {
        var date = new Date();
        var entity = {
            "id": date.getTime(),
            "type": "totp",
            "name": $("#name").val(),
            "issuer": $("#name").val(),
            "icon": null,
            "info": {
                "secret": $("#secret").val(),
                "algo": "SHA1",
                "digits": 6,
                "period": 30
            }
        }

        if (!allData.entries)
            allData.entries = [];

        allData.entries.push(entity);
        // writeData();
        setStorage()
    })

    $(document).delegate(".delete-btn", "click", function (e) {
        var value = $("#deleteModal").attr("dataid");
        allData.entries = allData.entries.filter(x => {
            return x.id != value
        })
        //writeData()
        setStorage()
    })
});