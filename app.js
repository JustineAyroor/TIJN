var mysql           = require('mysql')
    express         = require('express'),
    app             = express(),
    bodyParser      = require('body-parser'),
    flash           = require("connect-flash"),
    ejs             = require('ejs'),
    alert           = require('alert-node');
// body parser and views config
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine','ejs');
app.use(express.static(__dirname + "/public"));    
app.locals.user = null;
app.locals.success = null;
app.locals.error = null;

// SQL connection config
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'justy2496',
  database : 'TIJN'
});

connection.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});
 
// ROUTES
app.get("/", function(req,res){
    console.log(req.app.locals.user);
    res.render('landing');
});

app.get("/register", function(req,res){
    queryString = "SELECT * FROM BANK";
    connection.query(queryString, function(err,results){
        if(err || !results.length){
            alert("Database Error");
            res.redirect('/register');
        } else {
            res.render('register', {results : results});
        }    
    });
});

app.post("/register", function(req,res){
    var userAccount = {SSN: req.body.SSN, FNAME: req.body.FName, LNAME: req.body.LName, EMAIL: req.body.Email, PASSWORD: req.body.Password};
    queryString = "INSERT INTO USER_ACCOUNT SET ?";
    connection.query(queryString, userAccount, function(error){
        if(error){
            alert("ERROR OCCURRED WHILE INSERT");
            res.redirect('/register');
        }else{
            var BankAccount = {USSN: req.body.SSN, BANK_ID: req.body.BankName, ACCOUNT_NO: req.body.AccNo, BALANCE: req.body.Balance, IS_PRIMARY: 1};
            queryString = "INSERT INTO BANK_ACCOUNT SET ?";
            connection.query(queryString, BankAccount, function(error){
                if(error){
                    alert("ERROR OCCURRED WHILE INSERT");
                    res.redirect('/register');
                }else{
                    req.app.locals.user = req.body.Email;
                    alert("WELCOME TO TIJN");
                    res.redirect('/home/'+ req.body.Email);
                }
            });
        }
    });
});

app.get("/login", function(req,res){
    res.render('login');
});

app.post("/login", function(req,res){
    var email = req.body.email;
    var password = req.body.password;
    querystring = "SELECT * FROM USER_ACCOUNT WHERE EMAIL ='" + email + "'";
    connection.query(querystring, function(error,results,fields){
        if(error || !results.length){
            alert("NO USER FOUND IN DATABASE");
            res.redirect('/login');
        }else if(results[0].PASSWORD == password){
            res.app.locals.user = email;
            res.redirect('/home/' + email);
        }else{
            alert("PLEASE ENTER CORRECT CREDENTIALS OR REGISTER ON TIJN");
            res.redirect('/login');
        }
    });
});

app.get("/home/:email", isLoggedIn, function(req,res){
    user_email = req.app.locals.user;
    queryString = "SELECT * FROM usersinfo,BANK WHERE IS_PRIMARY = 1 AND EMAIL='" + user_email +"' AND usersinfo.BANK_ID = BANK.BANK_ID";
    connection.query(queryString, function(err,results){
        if(err || !results.length){
            alert("DATABASE ERROR OCCURED");
            res.redirect('/login');
        }else{
            queryString = "SELECT EMAIL,R_SSN,DATE,R_AMT FROM REQ_TRAN,USER_ACCOUNT WHERE S_EMAIL ='"+ user_email +"' AND R_SSN = SSN ORDER BY DATE DESC";
            connection.query(queryString, function(err,req_note){
                if(err || !req_note.length){
                    message = "NO REQUEST MADE TO USER"
                    res.render('home', {Req_Note : req_note, message : message,results : results});
                }else{
                    res.render('home', {Req_Note : req_note, results : results});
                }
            });
        }
    });
});


app.get("/home/:email/edit", isLoggedIn, function(req,res){
    res.render('edit');
});

app.get("/home/:email/edit/UserProfile", isLoggedIn, function(req,res){
    queryString = "SELECT EMAIL,PASSWORD FROM USER_ACCOUNT WHERE EMAIL = '" + req.app.locals.user + "'";
    connection.query(queryString, function(err,results){
        if(err || !results.length){
            alert("USER NOT FOUND");
            res.redirect('/home/'+ req.app.locals.user);
        } else {
            res.render('editUserProfile');
        }
    });
});

app.post("/home/:email/edit/UserProfile", isLoggedIn, function(req,res){
    oldemail = req.params.email;
    queryString = "UPDATE USER_ACCOUNT SET EMAIL='"+ req.body.email +"',PASSWORD='"+ req.body.password +"' WHERE EMAIL='"+ req.app.locals.user +"'";
    connection.query(queryString, function(err){
        if(err){
            alert("UPDATE FAILED ON USER_ACCOUNT");
            res.redirect('/home/'+ req.app.locals.user);
        } else{
            req.app.locals.user = req.body.email
            queryString = "UPDATE REQ_TRAN SET S_EMAIL='"+req.body.email+"'WHERE S_EMAIL='"+oldemail+"'";
            connection.query(queryString, function(err){
                if(err){
                    alert("UPDATE FAILED ON REQ_TRAN");
                } else{
                    alert("UPDATE SUCCESSFULL ON USER_ACCOUNT");
                    res.redirect('/home/'+ req.app.locals.user);
                }
            });
        }
    });
});

app.get("/home/:email/edit/UserBanks", isLoggedIn, function(req,res){
    queryString = "SELECT * FROM usersinfo,BANK WHERE EMAIL='" + req.app.locals.user +"' AND usersinfo.BANK_ID = BANK.BANK_ID ORDER BY IS_PRIMARY DESC";
    connection.query(queryString, function(err,results){
        if(err){
            alert("DATABASE ERROR");
            res.redirect('/home/'+ req.app.locals.user);
        } else{
            queryString = "SELECT * FROM BANK";
            connection.query(queryString, function(err,banklist){
                if(err){
                    alert("DATABASE ERROR");
                    res.redirect('/home/'+ req.app.locals.user);
                } else{
                    res.render('editUserBanks',{results:results, banklist:banklist});
                }
            });
        }
    });
});

app.post("/home/:email/edit/UserBanks", isLoggedIn, function(req,res){
    queryString = "SELECT SSN FROM USER_ACCOUNT WHERE EMAIL='"+ req.app.locals.user + "'";
    connection.query(queryString, function(err,userssn){
        if(err){
            alert("DATABASE ERROR");
            res.redirect('/home/'+ req.app.locals.user);
        } else{
            var BankAccount = {USSN: userssn[0].SSN, BANK_ID: req.body.BankName, ACCOUNT_NO: req.body.AccNo, BALANCE: req.body.Balance, IS_PRIMARY: 0};
            queryString = "INSERT INTO BANK_ACCOUNT SET ?";
            connection.query(queryString, BankAccount, function(err){
                if(err){
                    alert("FAILED TO INSERT ON BANK_ACCOUNT");
                    res.redirect('/home/'+ req.app.locals.user);
                } else {
                    alert("SUCCESSFULL INSERT ON BANK_ACCOUNT");
                    res.redirect('/home/'+ req.app.locals.user + '/edit/UserBanks')
                }
            });
        }
    });
});

app.post("/home/:email/deleteBank/:bid/:bacc", isLoggedIn, function(req,res){
    queryString = "DELETE FROM BANK_ACCOUNT WHERE USSN IN (SELECT SSN FROM USER_ACCOUNT WHERE EMAIL='" + req.app.locals.user+ "') AND BANK_ID= '" + req.params.bid + "' AND ACCOUNT_NO='"+ req.params.bacc+"'";
    connection.query(queryString, function(err){
        if(err){
            // console.log(err);
            alert("FAILED TO DELETE ON BANK_ACCOUNT");
            res.redirect('/home/'+ req.app.locals.user);
        } else{
            alert("SUCCESSFULL DELETE ON BANK_ACCOUNT");
            res.redirect('/home/'+ req.app.locals.user + '/edit/UserBanks')
        }
    });
});

app.post("/home/:email/makePrimaryBank/:bid/:bacc", isLoggedIn, function(req,res){
    queryString = "UPDATE BANK_ACCOUNT SET IS_PRIMARY = 0 WHERE USSN IN (SELECT SSN FROM USER_ACCOUNT WHERE EMAIL='"+ req.app.locals.user + "') AND IS_PRIMARY = 1";
    connection.query(queryString, function(err){
        if(err){
            alert("DATABASE ERROR");
            res.redirect('/home/'+ req.app.locals.user);
        } else{
            queryString = "UPDATE BANK_ACCOUNT SET IS_PRIMARY = 1 WHERE USSN IN (SELECT SSN FROM USER_ACCOUNT WHERE EMAIL='"+ req.app.locals.user + "') AND BANK_ID='"+ req.params.bid +"' AND ACCOUNT_NO='"+req.params.bacc +"'";
            connection.query(queryString, function(err){
                if(err){
                    alert("DATABASE ERROR");
                    res.redirect('/home/'+ req.app.locals.user);
                } else{
                    alert("UPDATED PRIMARY BANK SUCCESSFULLY");
                    res.redirect('/home/'+ req.app.locals.user + '/edit/UserBanks');
                }
            });
        }
    });
});

app.post("/home/:email/addBalance", isLoggedIn, function(req,res){
    queryString = "UPDATE BANK_ACCOUNT SET BALANCE = BALANCE +'" + req.body.Balance + "' WHERE USSN IN (SELECT SSN FROM USER_ACCOUNT WHERE EMAIL='"+ req.app.locals.user + "') AND IS_PRIMARY = 1";
    connection.query(queryString, function(err,results){
        if(err){
            alert("DATABASE ERROR");
            res.redirect('/home/'+ req.app.locals.user);
        } else{
            alert("BALANCE ADDED TO PRIMARY ACCOUNT");
            res.redirect('/home/'+ req.app.locals.user + '/edit/UserBanks',)
        }
    });
});

app.get("/home/:email/history", isLoggedIn, function(req,res){
    queryString = "SELECT * FROM SEND_TRAN WHERE S_SSN IN (SELECT SSN FROM USER_ACCOUNT WHERE EMAIL='"+ req.app.locals.user+"') ORDER BY DATE DESC";
    connection.query(queryString, function(err, sendtransDets){
        if(err){
            alert("NO RESULT FOUND ON SEND_TRAN");
            res.redirect('/home/'+ req.app.locals.user);
        } else{
            queryString = "SELECT * FROM SEND_TRAN,USER_ACCOUNT WHERE R_EMAIL ='"+req.app.locals.user+"' AND S_SSN = SSN ORDER BY DATE DESC";
            connection.query(queryString, function(err,rectransDets){
                if(err){
                    alert("NO RESULT FOUND ON REQ_TRAN");
                    res.redirect('/home/'+ req.app.locals.user);
                }else{
                    res.render('history',{sendtransDets: sendtransDets, rectransDets: rectransDets});
                }
            });
        }
    });
});

app.post("/home/:email/history/statements", isLoggedIn, function(req,res){
    queryString = "SELECT * FROM SEND_TRAN WHERE S_SSN IN (SELECT SSN FROM USER_ACCOUNT WHERE EMAIL='"+ req.app.locals.user+"') AND DATE BETWEEN '"+req.body.daterange1+"' AND '"+req.body.daterange2+"' ORDER BY DATE DESC";
    connection.query(queryString, function(err, sendtransDets){
        if(err){
            alert("NO RESULT FOUND ON SEND_TRAN");
            res.redirect('/home/'+ req.app.locals.user);
        } else{
            queryString = "SELECT * FROM SEND_TRAN,USER_ACCOUNT WHERE R_EMAIL ='"+req.app.locals.user+"' AND S_SSN = SSN AND DATE BETWEEN '"+req.body.daterange1+"' AND '"+req.body.daterange2+"' ORDER BY DATE DESC";
            connection.query(queryString, function(err,rectransDets){
                if(err){
                    alert("NO RESULT FOUND ON SEND_TRAN");
                    res.redirect('/home/'+ req.app.locals.user);
                }else{
                    res.render('history',{sendtransDets: sendtransDets, rectransDets: rectransDets});
                }
            });
        }
    });
});

app.get("/home/:email/sendMoney", isLoggedIn, function(req,res){
    queryString = "SELECT * FROM usersinfo,BANK WHERE IS_PRIMARY = 1 AND EMAIL='" + req.app.locals.user +"' AND usersinfo.BANK_ID = BANK.BANK_ID";
    connection.query(queryString, function(err,results){
        if(err){
            alert("DATABASE  ERROR");
            res.redirect('/home/'+ req.app.locals.user);
        } else {
            res.render('sendMoney',{results:results});
        }
    });
});

app.post("/home/:email/sendMoney", isLoggedIn, function(req,res){
    queryString = "SELECT * FROM usersinfo WHERE IS_PRIMARY = 1 AND EMAIL='" + req.app.locals.user +"'";
    connection.query(queryString, function(err,senderDets){
        if(err || !senderDets.length){
            alert("DATABASE  ERROR");
            res.redirect('/home/'+ req.app.locals.user);
        } else {
            if(senderDets[0].BALANCE>=req.body.Amount){
                queryString = "UPDATE BANK_ACCOUNT SET BALANCE = BALANCE -'"+ req.body.Amount +"' WHERE USSN = '"+ senderDets[0].SSN +"' AND IS_PRIMARY=1";
                connection.query(queryString, function(err){
                    if(err){
                        alert("FAILED TO UPDATE ON SENDER SIDE");
                        res.redirect('/home/'+ req.app.locals.user);
                    } else{
                        console.log("UPDATE RECEIVER BANK");
                        queryString = "UPDATE BANK_ACCOUNT SET BALANCE = BALANCE +'"+ req.body.Amount +"' WHERE USSN IN (SELECT SSN FROM USER_ACCOUNT WHERE EMAIL='"+ req.body.r_email +"') AND IS_PRIMARY = 1";
                        connection.query(queryString, function(err){
                            if(err){
                                alert("FAILED TO UPDATE ON RECEIVER SIDE");
                                res.redirect('/home/'+ req.app.locals.user);
                            } else{
                                var send_tran = {S_SSN: senderDets[0].SSN, R_EMAIL: req.body.r_email, S_AMT: req.body.Amount};
                                queryString = "INSERT INTO SEND_TRAN SET ?";
                                connection.query(queryString, send_tran, function(err){
                                    if(err){
                                        alert("FAILED TO INSERT ON SEND_TRAN");
                                        res.redirect('/home/'+ req.app.locals.user);
                                    } else {
                                        alert("TRANSACTION DONE AND BALANCE UPDATED! CHECK STATEMENTS");
                                        res.redirect('/home/'+ req.app.locals.user);
                                    }
                                });
                            }
                        });
                    }
                });
            }else{
                alert("BALANCE TOO LOW FOR THIS TRANSACTION! PLEASE CHANGE PRIMARY ACCOUNT OR ADD MORE BALANCE");
                res.redirect('/home/'+ req.app.locals.user+ '/sendMoney');
            }
        }
    });
});

app.post("/home/:email/sendMoney/:reqsenderSSN/:amount", isLoggedIn, function(req,res){
    queryString = "SELECT * FROM usersinfo,BANK WHERE IS_PRIMARY = 1 AND EMAIL='" + req.app.locals.user +"'";
    connection.query(queryString, function(err,senderDets){
        if(err){
            alert("DATABASE ERROR");
            res.redirect('/home/'+req.app.locals.user);
        } else{
            queryString = "SELECT * FROM usersinfo WHERE IS_PRIMARY = 1 AND SSN='" + req.params.reqsenderSSN +"'";
            connection.query(queryString, function(err,receiverDets){
                if(err){
                    alert("DATABASE ERROR");
                    res.redirect('/home/'+req.app.locals.user);
                } else{
                    if(senderDets[0].BALANCE>req.params.amount){
                        queryString = "UPDATE BANK_ACCOUNT SET BALANCE = BALANCE -'"+ req.params.amount +"' WHERE USSN = '"+ senderDets[0].SSN +"' AND IS_PRIMARY=1";
                        connection.query(queryString, function(err){
                            if(err){
                                alert("FAILED TO UPDATE ON SENDER SIDE");
                                res.redirect('/home/'+req.app.locals.user);
                            }else{
                                queryString = "UPDATE BANK_ACCOUNT SET BALANCE = BALANCE +'"+ req.params.amount +"' WHERE USSN = '"+ receiverDets[0].SSN +"' AND IS_PRIMARY=1";
                                connection.query(queryString, function(err){
                                    if(err){
                                        alert("FAILED TO UPDATE ON RECEIVER SIDE");
                                        res.redirect('/home/'+req.app.locals.user);
                                    } else{
                                        queryString = "INSERT INTO SEND_TRAN SET ?";
                                        var send_tran = {S_SSN: senderDets[0].SSN, R_EMAIL: receiverDets[0].EMAIL, S_AMT: req.params.amount};
                                        connection.query(queryString, send_tran, function(err){
                                            if(err){
                                                alert("FAILED TO INSERT ON SEND_TRAN");
                                                res.redirect('/home/'+req.app.locals.user);
                                            } else{
                                                queryString = "DELETE FROM REQ_TRAN WHERE R_SSN ='"+ req.params.reqsenderSSN+"' AND S_EMAIL ='"+ req.params.email+"' AND R_AMT='"+ req.params.amount+"'";
                                                connection.query(queryString, function(err){
                                                    if(err){
                                                        // console.log(err);
                                                        alert("FAILED TO DELETE REQ NOTIFICATION");
                                                        res.redirect('/home/'+req.app.locals.user);
                                                    } else{
                                                        alert("TRANSACTION COMPLETE! CHECK STATEMENTS");
                                                        res.redirect('/home/'+req.app.locals.user);
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }else{
                        alert("YOUR BAL IS TOO LOW FOR THIS TRANSACTION");
                        res.redirect('/home/'+req.app.locals.user);
                    }
                }
            });
        }
    });
});

app.get("/home/:email/reqMoney", isLoggedIn, function(req,res){
    queryString = "SELECT * FROM usersinfo,BANK WHERE IS_PRIMARY = 1 AND EMAIL='" + req.app.locals.user +"' AND usersinfo.BANK_ID = BANK.BANK_ID";
    connection.query(queryString, function(err,results){
        if(err){
            console.log(err);
            alert("DATABASE ERROR");
            res.redirect('/home/'+req.app.locals.user);
        } else {
            res.render('reqMoney',{results:results});
        }
    });
});

app.post("/home/:email/reqMoney", isLoggedIn, function(req,res){
    queryString = "SELECT SSN FROM USER_ACCOUNT WHERE EMAIL='"+ req.app.locals.user+"'";
    connection.query(queryString, function(err,ssnres){
        if(err){
            alert("NO USER FOUND");    
            res.redirect('/home/'+req.app.locals.user);
        } else{
            var req_tran = {R_SSN: ssnres[0].SSN, S_EMAIL: req.body.s_email, R_AMT: req.body.Amount};
            queryString = "INSERT INTO REQ_TRAN SET ?";
            connection.query(queryString, req_tran, function(err){
                if(err){
                    alert("FAILED TO INSERT ON REQ_TRAN");
                } else {
                    alert("REQUEST SENT!");
                    res.redirect('/home/'+ req.app.locals.user);
                }
            });
        }    
    });
});

app.get("/logout", function(req,res){
    req.app.locals.user = null;
    alert("LOGGED YOU OUT SUCCESSFULLY!! BYE");
    res.redirect('/');
});

function isLoggedIn(req, res, next){
    if(req.app.locals.user == null){
        res.redirect('/login');
    }else{
        next();
    }
}
// Server listen
app.listen('3000','localhost', function(){
    console.log("THE TIJN SERVER HAS STARTED ON LOCALHOST PORT 3000!");
 });