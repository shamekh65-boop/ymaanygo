/* ── state.js ── */
let U=null,P=null,rides=[],online=true,curPg=0,locW=null;
let notifRid=null,navApp=localStorage.getItem("nav")||"google";
let calY=new Date().getFullYear(),calM=new Date().getMonth();
let calExp=false,selDate=new Date().toISOString().slice(0,10);
let knownIds=new Set(),pollingInterval=null,notifTimer=null;
let offlineQueue=[];
let isNetworkOnline=navigator.onLine;
const geocodeCache=new Map();
let lastIDBWrite=0;
const IDB_THROTTLE_MS=8000;
const MONTHS=["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];
