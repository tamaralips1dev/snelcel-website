
window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }
(function(){
  function cookie(naam){
    var m = document.cookie.match("(^|; )" + naam + "=([^;]*)");
    return m ? decodeURIComponent(m[2]) : "";
  }
  var keuze = cookie("snelcel_cookies");
  var statistieken = /s=1/.test(keuze);
  var marketing = /m=1/.test(keuze);

  gtag("consent", "default", {
    ad_storage:            marketing ? "granted" : "denied",
    ad_user_data:          marketing ? "granted" : "denied",
    ad_personalization:    marketing ? "granted" : "denied",
    analytics_storage:     statistieken ? "granted" : "denied",
    functionality_storage: "granted",
    security_storage:      "granted",
    wait_for_update: 600
  });

  if(keuze){
    dataLayer.push({event:"cookie_consent", statistieken:statistieken, marketing:marketing});
  }
  window.snelcelKeuze = keuze;
})();
