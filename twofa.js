const fs = require('fs')
const { TOTP } = require('totp-generator')
const path = require('path')

const filePath = path.join(__dirname, 'data.json')

var remainSeconds = 0;

function readData() {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return;
        }
        const response = JSON.parse(data)
        // handle the json data here
        $(".twofa-list").html("");

        response.entries.map((x) => {

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
                <div class="row">
                    <div class="col-10">
                        <label class="title">${x.name}</label>
                        <label class="code">${otp}</label>
                    </div>
                    <div class="col-1 time-wrapper">
                        <div class="time">${remainSeconds}</div>
                    </div>
                </div>
                `)
        })

    });
}

function toast() {
    // Get the snackbar DIV
    var x = document.getElementById("snackbar");
  
    // Add the "show" class to DIV
    x.className = "show";
  
    // After 3 seconds, remove the show class from DIV
    setTimeout(function(){ x.className = x.className.replace("show", ""); }, 1500);
  }

$(document).ready(function () {
    setInterval(function () {
        if (remainSeconds < 2) {
            $(".time").html("");
            readData()
        }
        else {
            remainSeconds--;
            $(".time").html(remainSeconds);
        }

    }, 1000)

    $(document).delegate(".row","click", function (e) {
        var target = e.currentTarget;
        var value = $(target).find(".code").html();
        navigator.clipboard.writeText(value);
        toast();
    })

});