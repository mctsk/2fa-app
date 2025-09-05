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
var countdownNumberEl;
var editActive = false;

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

let firstStart =true;

function getStorage() {
	               
    storage.get('userData', function (error, data) {
        if (error) throw error;

        const response = data
        
        if(response != null && response.entries != null)
            allData = response;
        else
            allData = {entries:[]}

        // handle the json data here
        $(".twofa-list").html("");

        allData = response;

        var time = new Date();

        // var t1 = time.getTime()

        // const { expires } = TOTP.generate(allData.entries[0].info.secret, {
        //     digits: allData.entries[0].info.digits,
        //     period: allData.entries[0].info.period,
        //     timestamp: Date.now(),
        // })
        
        remainSeconds = 30 - (Math.floor(time / 1000) % 30);
        
        response?.entries?.sort((a, b) => a.queue - b.queue).map((x) => {

            const key = x.info.secret
            x.id = x.id ?? Math.random().toString(36);

            const { otp } = TOTP.generate(key, {
                digits: x.info.digits,
                period: x.info.period,
                timestamp: Date.now(),
            })
            var optText = otp.toString().substring(0, 2) + " <span>" + otp.toString().substring(1, 3) + "</span> " + otp.toString().substring(4, 6);
            

            $(".twofa-list").append(`
                <li class="row row-2fa " dataid="${x.id}">
                <div class="wrapper"></div>
                    <div class="col d-flex justify-content-center align-items-center f-order p-0 ${editActive ? "":"hide-on"}">
                        <i class="bi bi-grip-horizontal"></i>
                    </div>
                    <div class="col-7 d-flex flex-column justify-content-center align-items-start ">
                        <label class="title">${x.name}</label>
                        <label class="code" otpdata="${otp}">${optText}</label>
                    </div>
                    <div class="col time-wrapper d-flex flex-column justify-content-center align-items-end">
                     <div id="countdown" name="countdown"><div class="time"><div>${ firstStart ?'':'30' }</div></div></div>
                    </div>
                    <div class="col d-flex ${editActive ? "":"hide-on"} f-edit justify-content-end align-items-center p-0">
                <a href="#" class="edit" dataid="${x.id}" data-bs-toggle="modal" data-bs-target=".delete-modal"><i class="bi bi-pen"></i></i></a>
                </div>
                <div class="col d-flex ${editActive ? "":"hide-on"} f-delete justify-content-end align-items-center p-0">

                <a href="#" class="delete" dataid="${x.id}" data-bs-toggle="modal" data-bs-target=".delete-modal"><i class="bi bi-trash3"></i></a>
                </div>
                </li>
                
                `)
        })

        if(firstStart)
        {
            $(document).trigger("onListLoaded");
            firstStart=false;
        }
        else
        {
            timeDown(remainSeconds)
            //circleAnimation(113,30);
        }
    });
}

function setStorage() {
    storage.set('userData', allData, function (error) {
        if (error) throw error;

        $("#addNewModal").find("input").val("");
        $("#addNewModal").attr("dataid","");

        addModal.hide();
        deleteModal.hide();

        getStorage();
    });
}

function toast() {
    snackbar.className = "show";
    setTimeout(function () { snackbar.className = snackbar.className.replace("show", ""); }, 1500);
}

function timeDown(_remainSeconds){

    var countdown = _remainSeconds;
    countdownNumberEl.html(countdown);
    setInterval(function() {
        countdown = --countdown <= 0 ? _remainSeconds : countdown;
        countdownNumberEl.html(countdown);
    }, 1000);
}

function circleAnimation(remainpercentanimation,remainSeconds) {

    // document.styleSheets[1].cssRules[31].style.animationDuration=Math.round(remainSeconds)+"s"
    document.styleSheets[1].cssRules[31].style.animationDuration="30s"
    
    let myRules = document.styleSheets[1].cssRules;
    let keyframes = myRules[32];
    var rule =keyframes.findRule("from");
    
    //rule.style.strokeDashoffset = Math.round(100-remainpercentanimation)+"px";
    rule.style.strokeDashoffset = "0px";

}

var interval;

$(document).ready(function () {

    $(window).on("focus",function(event){
        firstStart = true;
        getStorage()
    });

    $(".edit-btn").on("click",function(event){

        if(editActive) {
            $(this).removeClass("active")
            $(".f-order,.f-edit,.f-delete").addClass("hide-on");
            $(".time-wrapper").addClass("align-items-start","align-items-end");
            editActive=false;
        } 
        else    {
            $(".f-order,.f-edit,.f-delete").removeClass("hide-on");
            $(".time-wrapper").removeClass("align-items-start","align-items-end");
            $(this).addClass("active")
            editActive=true;
        }

    });


    $(document).on("onListLoaded", function (remainSeconds) {

        var remainpercent = Math.round((remainSeconds / 30) * 113);
        var remainpercentanimation = Math.round((remainpercent / 113) * 100);
                
        //circleAnimation(remainpercentanimation,remainSeconds);
        
        if(!countdownNumberEl)
            countdownNumberEl = $('.time div');

        var countdown = remainSeconds;
        // countdownNumberEl.html(countdown);
        interval =  setInterval(function() {
                countdown = --countdown <= 0 ? 30 : countdown;
                //countdownNumberEl.html(countdown);
                if(countdown <=0)
                    clearInterval(interval);
            }, 1000);
        });
    
    snackbar = document.getElementById("toast");

    setInterval(function () {
        if (remainSeconds <= 1) {
            $(".time div").html("");
            // readData()
            getStorage();
        }
        else {
            remainSeconds--;
            $(".time div").html(remainSeconds);
        }

    }, 1000)

    $(document).delegate(".row-2fa", "click", function (e) {
        var target = e.currentTarget;
        var value = $(target).find(".code").attr("otpdata");
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

    $(document).delegate(".edit", "click", function (e) {
        var target = e.currentTarget;
        var value = $(target).attr("dataid")
        $("#addNewModal").attr("dataid", value)

        var entity = allData.entries.find(x => { return x.id == value });
        $("#name").val(entity.name );
        $("#secret").val(entity.info.secret);

        addModal.show();
    })

    $(document).delegate(".save-btn", "click", function (e) {

        var value = $("#addNewModal").attr("dataid");

        if(!value){
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
            allData.entries.push(entity);
        }
        else{
            var entity = allData.entries.find(x => { return x.id == value });
            entity.name = $("#name").val();
            entity.info.secret = $("#secret").val();
        }

        if (!allData.entries)
            allData.entries = [];

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