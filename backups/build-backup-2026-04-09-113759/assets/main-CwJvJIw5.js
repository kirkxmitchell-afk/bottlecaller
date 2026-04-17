const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/progressionRouter-D5C7Tqz2.js","assets/modulepreload-polyfill-B5Qt9EMX.js","assets/supabase-9Uy4coDN.js","assets/vendor_ui-tWD4K6Lg.js","assets/vendor-Ci5FaxOL.js"])))=>i.map(i=>d[i]);
import"./modulepreload-polyfill-B5Qt9EMX.js";import{c as gl}from"./supabase-9Uy4coDN.js";import"./vendor_ui-tWD4K6Lg.js";import"./vendor-Ci5FaxOL.js";const pl="modulepreload",_l=function(e){return"/"+e},vs={},xa=function(t,n,r){let a=Promise.resolve();if(n&&n.length>0){let c=function(o){return Promise.all(o.map(d=>Promise.resolve(d).then(p=>({status:"fulfilled",value:p}),p=>({status:"rejected",reason:p}))))};document.getElementsByTagName("link");const i=document.querySelector("meta[property=csp-nonce]"),l=i?.nonce||i?.getAttribute("nonce");a=c(n.map(o=>{if(o=_l(o),o in vs)return;vs[o]=!0;const d=o.endsWith(".css"),p=d?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${o}"]${p}`))return;const m=document.createElement("link");if(m.rel=d?"stylesheet":pl,d||(m.as="script"),m.crossOrigin="",m.href=o,l&&m.setAttribute("nonce",l),document.head.appendChild(m),d)return new Promise((g,u)=>{m.addEventListener("load",g),m.addEventListener("error",()=>u(new Error(`Unable to preload CSS for ${o}`)))})}))}function s(i){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=i,window.dispatchEvent(l),!l.defaultPrevented)throw i}return a.then(i=>{for(const l of i||[])l.status==="rejected"&&s(l.reason);return t().catch(s)})},fl="https://ezbcahmbzeyucqxcyfad.supabase.co",yl="sb_publishable_nR6n3OyYSYMQaRq6iWNfIA_UzAgGfgZ",an="bc_supabase_auth_v1";function hl(){try{return window.self!==window.top}catch{return!0}}if(hl())throw console.error("[SUPABASE] supabaseParent imported inside iframe. Forbidden."),new Error("Supabase parent client import is forbidden in iframe context.");let Ve=null;function wl(){const e=new Map;return{getItem:t=>e.has(t)?e.get(t):null,setItem:(t,n)=>{e.set(t,String(n))},removeItem:t=>{e.delete(t)}}}function Nn(){if(Ve)return Ve;let e=null;try{e=localStorage.getItem("__BC_LOGOUT_LOCK__")}catch{}const t=!!window.__BC_FORCE_LOGGED_OUT__||!!e;return Ve=gl(fl,yl,{auth:t?{persistSession:!1,autoRefreshToken:!1,detectSessionInUrl:!1,storageKey:an,storage:wl()}:{persistSession:!0,autoRefreshToken:!0,detectSessionInUrl:!1,storageKey:an}}),Ve.__BC_ID__="sb_"+Math.random().toString(16).slice(2),window.__BC_SUPABASE__=Ve,window.__BC_SUPABASE_ID__=Ve.__BC_ID__,window.__BC_SUPABASE_STORAGE_KEY__=an,console.log("[SUPABASE] created PARENT client",Ve.__BC_ID__,"forceLoggedOut=",t),Ve}function bl(){try{localStorage.removeItem(an)}catch{}try{sessionStorage.removeItem(an)}catch{}try{for(let e=localStorage.length-1;e>=0;e--){const t=localStorage.key(e);t&&t.startsWith("sb-")&&t.includes("auth-token")&&localStorage.removeItem(t)}}catch{}try{for(let e=sessionStorage.length-1;e>=0;e--){const t=sessionStorage.key(e);t&&t.startsWith("sb-")&&t.includes("auth-token")&&sessionStorage.removeItem(t)}}catch{}}async function vl(e,t){return Nn().auth.signInWithPassword({email:e,password:t})}async function Sl(e,t,n={}){return Nn().auth.signUp({email:e,password:t,options:{data:n,emailRedirectTo:window.location.origin}})}async function El(){return Nn().auth.signOut({scope:"global"})}async function ai(){const e=Nn(),{data:t,error:n}=await e.auth.getSession();return{session:t?.session??null,error:n}}const si="BC_MSG",ii=1;function Rl(e){return!!e&&e.source===si&&e.v===ii&&typeof e.type=="string"}function Qr(e,t={}){return{source:si,v:ii,type:e,...t}}const x=Object.freeze({CTX_REQUEST:"bc_ctx_request",LOGOUT_REQUEST:"bc_logout_request",WINES_REQUEST:"wines_request",WINES_MUTATE:"wines_mutate",RUNS_COUNT_REQUEST:"runs_count_request",RITUAL_STATUS_REQUEST:"ritual_status_request",MESSAGES_UNREAD_REQUEST:"messages_unread_request",MESSAGE_MARK_READ:"message_mark_read",LEADERBOARD_REQUEST:"leaderboard_request",PROGRESSION_SNAPSHOT_REQUEST:"progression_snapshot_request",PROGRESS_REPORT_SUBMIT:"progress_report_submit",HARD_RESET_PROGRESSION:"hard_reset_progression",TOURNAMENT_CREATE:"tournament_create",TOURNAMENT_SNAPSHOT:"tournament_snapshot",TOURNAMENT_START:"tournament_start",TOURNAMENT_ADVANCE:"tournament_advance",TOURNAMENT_RESTORE:"tournament_restore",TOURNAMENT_CHECKPOINT:"tournament_checkpoint",CTX:"bc_ctx",CTX_NOT_READY:"ctx_not_ready",CTX_REQUIRED:"ctx_required",AUTH_STATE:"auth_state",WINES_REPORT:"wines_report",WINES_MUTATE_RESULT:"wines_mutate_result",RUNS_COUNT_RESPONSE:"runs_count_response",RITUAL_STATUS_RESPONSE:"ritual_status_response",MESSAGES_UNREAD_RESPONSE:"messages_unread_response",MESSAGE_MARK_READ_RESULT:"message_mark_read_result",LEADERBOARD_RESPONSE:"leaderboard_response",PROGRESSION_SNAPSHOT:"progression_snapshot",PROGRESS_REPORT_SUBMIT_RESULT:"progress_report_submit_result",HARD_RESET_PROGRESSION_RESULT:"hard_reset_progression_result",TOURNAMENT_CREATED:"tournament_created",TOURNAMENT_SNAPSHOT_RESULT:"tournament_snapshot_result",TOURNAMENT_STARTED:"tournament_started",TOURNAMENT_ADVANCED:"tournament_advanced",TOURNAMENT_RESTORED:"tournament_restored",TOURNAMENT_CHECKPOINT_RESULT:"tournament_checkpoint_result",ERROR:"bc_error"});function Il({allowedOrigin:e,handlers:t,state:n={},debug:r=!1}){if(!e)throw new Error("createBcBridge: allowedOrigin is required");const a=(...l)=>r&&console.log("[BC_BRIDGE]",...l);function s(l,c){try{l.source?.postMessage(c,e)}catch(o){console.warn("[BC_BRIDGE] postMessage failed",o)}}async function i(l){if(l.origin!==e)return;const c=l.data;if(!Rl(c))return;const o=t[c.type];if(!o){a("no handler for",c.type),s(l,Qr(x.ERROR,{ok:!1,error:"UNKNOWN_MSG",got:c.type}));return}try{a("->",c.type,c);const d=performance.now();await o({msg:c,event:l,state:n,send:p=>s(l,p),reply:(p,m={})=>s(l,Qr(p,m))}),a("<-",c.type,Math.round(performance.now()-d)+"ms")}catch(d){console.warn("[BC_BRIDGE] handler failed",c.type,d),s(l,Qr(x.ERROR,{ok:!1,error:"HANDLER_FAILED",detail:String(d?.message||d)}))}}return window.addEventListener("message",i),{dispose(){window.removeEventListener("message",i)}}}function Ss({doLogout:e}){if(!e)throw new Error("makeLogoutHandler: doLogout required");return async({reply:t})=>{t(x.AUTH_STATE,{authed:!1}),await e("iframe_request")}}function Cl({getBcCtx:e}){if(!e)throw new Error("makeCtxHandler: getBcCtx required");return async({msg:t,event:n,state:r,reply:a})=>{const s=t.mode||"premium",i=await e({requestedMode:s,msg:t,event:n,state:r});i&&a(x.CTX,{...i})}}function Tl({fetchWines:e}){if(!e)throw new Error("makeWinesHandler: fetchWines required");return async({msg:t,event:n,state:r,reply:a})=>{const{reqId:s,restaurantId:i,mode:l}=t,c=await e({restaurantId:i,mode:l,msg:t,event:n,state:r});a(x.WINES_REPORT,{ok:!0,reqId:s,wines:c})}}function Al({supabase:e,getSourceCtx:t,isDemoMsg:n,rejectIfEpochMismatch:r,getSenderCtxOrReject:a,getLiveAuthOrNull:s}){if(!e)throw new Error("makeWinesMutateHandler: supabase required");if(!t)throw new Error("makeWinesMutateHandler: getSourceCtx required");if(!n)throw new Error("makeWinesMutateHandler: isDemoMsg required");if(!r)throw new Error("makeWinesMutateHandler: rejectIfEpochMismatch required");if(!a)throw new Error("makeWinesMutateHandler: getSenderCtxOrReject required");if(!s)throw new Error("makeWinesMutateHandler: getLiveAuthOrNull required");return async({msg:i,event:l,reply:c})=>{const o=x.WINES_MUTATE_RESULT,d=i?.reqId||null,p=String(i?.action||""),m=i?.payload||{},g=t(l.source);if(n(i,g)){c(o,{reqId:d,ok:!0,demo:!0});return}if(r(l,i,o,{reqId:d}))return;if(!p){c(o,{reqId:d,ok:!1,error:"missing_action"});return}const u=a(l,g,o,{reqId:d},{requireRestaurant:!0,allowedRoles:["single_manager","group_manager","enterpriser"]});if(!u)return;const h=(await s())?.userId||null;if(!h){c(o,{reqId:d,ok:!1,error:"no_session"});return}if(String(h)!==String(u.userId)){c(o,{reqId:d,ok:!1,error:"forbidden_user"});return}const w=u.restaurantId;try{if(p==="add"){const S={restaurant_id:w,created_by:h,name:m?.name||"",varietal:m?.varietal||"",fruit_tags:m?.fruit_tags||[],texture_tags:m?.texture_tags||[],oak_level:m?.oak_level||"",process:m?.process||"",region:m?.region||"",story:m?.story||""},{error:E}=await e.from("bc_wines").insert(S);if(E)throw E}else if(p==="upsert"){const S=m?.id;if(!S){c(o,{reqId:d,ok:!1,error:"missing_wine_id"});return}const{error:E}=await e.from("bc_wines").update({name:m?.name||"",varietal:m?.varietal||"",fruit_tags:m?.fruit_tags||[],texture_tags:m?.texture_tags||[],oak_level:m?.oak_level||"",process:m?.process||"",region:m?.region||"",story:m?.story||""}).eq("id",S).eq("restaurant_id",w);if(E)throw E}else if(p==="delete"){const S=m?.wineId||m?.id;if(!S){c(o,{reqId:d,ok:!1,error:"missing_wine_id"});return}const{error:E}=await e.from("bc_wines").delete().eq("id",S).eq("restaurant_id",w);if(E)throw E}else if(p==="delete_all"){const{error:S}=await e.from("bc_wines").delete().eq("restaurant_id",w);if(S)throw S}else{c(o,{reqId:d,ok:!1,error:"unsupported_action"});return}c(o,{reqId:d,ok:!0})}catch(S){c(o,{reqId:d,ok:!1,error:S?.message||String(S)})}}}function Bl({fetchRunsCount:e}){if(!e)throw new Error("makeRunsCountHandler: fetchRunsCount required");return async({msg:t,event:n,state:r,reply:a})=>{const{userId:s,restaurantId:i,mode:l}=t,c=await e({userId:s,restaurantId:i,mode:l,msg:t,event:n,state:r}),o=t?.reqId||null,d=Number(c&&typeof c=="object"?c.count||0:c||0);a(x.RUNS_COUNT_RESPONSE,{reqId:o,ok:!0,count:d})}}function Ml({supabase:e,getSourceCtx:t,isDemoMsg:n,rejectIfEpochMismatch:r,getSenderCtxOrReject:a,getLiveAuthOrNull:s}){if(!e)throw new Error("makeRitualStatusHandler: supabase required");if(!t)throw new Error("makeRitualStatusHandler: getSourceCtx required");if(!n)throw new Error("makeRitualStatusHandler: isDemoMsg required");if(!r)throw new Error("makeRitualStatusHandler: rejectIfEpochMismatch required");if(!a)throw new Error("makeRitualStatusHandler: getSenderCtxOrReject required");if(!s)throw new Error("makeRitualStatusHandler: getLiveAuthOrNull required");return async({msg:i,event:l,reply:c})=>{const o=x.RITUAL_STATUS_RESPONSE,d=i?.reqId||null,p=t(l.source);if(n(i,p)){c(o,{reqId:d,ok:!0,doneToday:!1,demo:!0});return}if(r(l,i,o,{reqId:d,doneToday:!1}))return;const m=a(l,p,o,{reqId:d,doneToday:!1},{requireRestaurant:!0,allowedRoles:["waiter","single_manager","group_manager","enterpriser"]});if(!m)return;const u=(await s())?.userId||null;if(!u){c(o,{reqId:d,ok:!1,doneToday:!1,error:"no_session"});return}if(String(u)!==String(m.userId)){c(o,{reqId:d,ok:!1,doneToday:!1,error:"forbidden_user"});return}const f=new Date,h=new Date(f.toLocaleString("en-US",{timeZone:"Africa/Johannesburg"})),w=new Date(h);w.setHours(0,0,0,0);const S=w.toISOString(),{data:E,error:b}=await e.from("bc_event_log").select("id").eq("event_type","ritual_completed").eq("user_id",m.userId).eq("restaurant_id",m.restaurantId).gte("occurred_at",S).limit(1);if(b){c(o,{reqId:d,ok:!1,doneToday:!1,error:b.message||String(b)});return}const B=Array.isArray(E)&&E.length>0;c(o,{reqId:d,ok:!0,doneToday:B})}}function xl({supabase:e,getSourceCtx:t,isDemoMsg:n,rejectIfEpochMismatch:r,getSenderCtxOrReject:a,getLiveAuthOrNull:s}){if(!e)throw new Error("makeMessagesUnreadHandler: supabase required");if(!t)throw new Error("makeMessagesUnreadHandler: getSourceCtx required");if(!n)throw new Error("makeMessagesUnreadHandler: isDemoMsg required");if(!r)throw new Error("makeMessagesUnreadHandler: rejectIfEpochMismatch required");if(!a)throw new Error("makeMessagesUnreadHandler: getSenderCtxOrReject required");if(!s)throw new Error("makeMessagesUnreadHandler: getLiveAuthOrNull required");return async({msg:i,event:l,reply:c})=>{const o=i?.reqId||null,d=t(l.source);if(n(i,d)){c(x.MESSAGES_UNREAD_RESPONSE,{reqId:o,ok:!0,rows:[],demo:!0});return}if(r(l,i,x.MESSAGES_UNREAD_RESPONSE,{reqId:o,rows:[]}))return;const p=a(l,d,x.MESSAGES_UNREAD_RESPONSE,{reqId:o,rows:[]},{requireRestaurant:!0,allowedRoles:["waiter","single_manager","group_manager","enterpriser"]});if(!p)return;const g=(await s())?.userId||null;if(!g){c(x.MESSAGES_UNREAD_RESPONSE,{reqId:o,ok:!1,rows:[],error:"no_session"});return}if(String(g)!==String(p.userId)){c(x.MESSAGES_UNREAD_RESPONSE,{reqId:o,ok:!1,rows:[],error:"forbidden_user"});return}const{data:u,error:f}=await e.from("bc_messages_v1").select("id, type, body, payload, sender_user_id, sender_role, receiver_user_id, created_at, restaurant_id, scope_id, scope_type").eq("receiver_user_id",p.userId).eq("restaurant_id",p.restaurantId).is("archived_at",null).is("read_at",null).order("created_at",{ascending:!0}).limit(25);if(f){c(x.MESSAGES_UNREAD_RESPONSE,{reqId:o,ok:!1,rows:[],error:f.message||String(f)});return}c(x.MESSAGES_UNREAD_RESPONSE,{reqId:o,ok:!0,rows:u||[]})}}function Ll({supabase:e,getSourceCtx:t,isDemoMsg:n,rejectIfEpochMismatch:r,getSenderCtxOrReject:a,getLiveAuthOrNull:s}){if(!e)throw new Error("makeMessageMarkReadHandler: supabase required");if(!t)throw new Error("makeMessageMarkReadHandler: getSourceCtx required");if(!n)throw new Error("makeMessageMarkReadHandler: isDemoMsg required");if(!r)throw new Error("makeMessageMarkReadHandler: rejectIfEpochMismatch required");if(!a)throw new Error("makeMessageMarkReadHandler: getSenderCtxOrReject required");if(!s)throw new Error("makeMessageMarkReadHandler: getLiveAuthOrNull required");return async({msg:i,event:l,reply:c})=>{const o=x.MESSAGE_MARK_READ_RESULT,d=i?.reqId||null,p=i?.id||null,m=t(l.source);if(n(i,m)){c(o,{reqId:d,ok:!0,demo:!0,id:p});return}if(r(l,i,o,{reqId:d,id:p}))return;const g=a(l,m,o,{reqId:d,id:p},{requireRestaurant:!0,allowedRoles:["waiter","single_manager","group_manager","enterpriser"]});if(!g)return;const f=(await s())?.userId||null;if(!f){c(o,{reqId:d,ok:!1,id:p,error:"no_session"});return}if(String(f)!==String(g.userId)){c(o,{reqId:d,ok:!1,id:p,error:"forbidden_user"});return}if(!p){c(o,{reqId:d,ok:!1,id:p,error:"missing_id"});return}const{error:h}=await e.from("bc_messages_v1").update({read_at:new Date().toISOString()}).eq("id",p).eq("receiver_user_id",g.userId);if(h){c(o,{reqId:d,ok:!1,id:p,error:h.message||String(h)});return}c(o,{reqId:d,ok:!0,id:p})}}function kl({supabase:e,getSourceCtx:t,isDemoMsg:n,rejectIfEpochMismatch:r,getSenderCtxOrReject:a,getLiveAuthOrNull:s}){if(!e)throw new Error("makeLeaderboardHandler: supabase required");if(!t)throw new Error("makeLeaderboardHandler: getSourceCtx required");if(!n)throw new Error("makeLeaderboardHandler: isDemoMsg required");if(!r)throw new Error("makeLeaderboardHandler: rejectIfEpochMismatch required");if(!a)throw new Error("makeLeaderboardHandler: getSenderCtxOrReject required");if(!s)throw new Error("makeLeaderboardHandler: getLiveAuthOrNull required");return async({msg:i,event:l,reply:c})=>{const o=x.LEADERBOARD_RESPONSE,d=i?.reqId||null,p=t(l.source);if(n(i,p)){c(o,{reqId:d,ok:!0,rows:[],demo:!0});return}if(r(l,i,o,{reqId:d,rows:[]}))return;const m=a(l,p,o,{reqId:d,rows:[]},{requireRestaurant:!0,allowedRoles:["waiter","single_manager","group_manager","enterpriser"]});if(!m)return;const u=(await s())?.userId||null;if(!u){c(o,{reqId:d,ok:!1,rows:[],error:"no_session"});return}if(String(u)!==String(m.userId)){c(o,{reqId:d,ok:!1,rows:[],error:"forbidden_user"});return}const{data:f,error:h}=await e.from("bc_waiter_leaderboard_v1").select("*").eq("restaurant_id",m.restaurantId).order("total_points",{ascending:!1}).order("last_activity_at",{ascending:!1}).limit(50);if(h){c(o,{reqId:d,ok:!1,rows:[],error:h.message||String(h)});return}c(o,{reqId:d,ok:!0,rows:f||[]})}}function Nl({getSourceCtx:e,isDemoMsg:t,rejectIfEpochMismatch:n,getSenderCtxOrReject:r,getLiveAuthOrNull:a,buildProgressionResult:s,getActiveRestaurantId:i,getAppState:l,getIframeEpoch:c}){if(!e)throw new Error("makeProgressionSnapshotHandler: getSourceCtx required");if(!t)throw new Error("makeProgressionSnapshotHandler: isDemoMsg required");if(!n)throw new Error("makeProgressionSnapshotHandler: rejectIfEpochMismatch required");if(!r)throw new Error("makeProgressionSnapshotHandler: getSenderCtxOrReject required");if(!a)throw new Error("makeProgressionSnapshotHandler: getLiveAuthOrNull required");if(!s)throw new Error("makeProgressionSnapshotHandler: buildProgressionResult required");if(!i)throw new Error("makeProgressionSnapshotHandler: getActiveRestaurantId required");if(!l)throw new Error("makeProgressionSnapshotHandler: getAppState required");if(!c)throw new Error("makeProgressionSnapshotHandler: getIframeEpoch required");return async({msg:o,event:d,reply:p})=>{const m=x.PROGRESSION_SNAPSHOT,g=o?.reqId||null,u=e(d.source);if(!u){p(x.CTX_NOT_READY,{ok:!1,reason:"no_sender_ctx",epoch:Number(c()||0),retryAfterMs:250,why:"no_sender_ctx"});return}if(t(o,u)){p(m,{reqId:g,ok:!0,demo:!0,tierToServe:1,reasons:[],reasonsHuman:[],snapshot:{encountersTotal:0,last10Count:0,last10Greens:0,last10Reds:0,anyRedT2Plus:!1,pivotsTaken:0,pivotsSuccess:0}});return}if(n(d,o,m,{reqId:g}))return;const f=r(d,u,m,{reqId:g},{requireRestaurant:!0,allowedRoles:["waiter","single_manager","group_manager","enterpriser"]});if(!f)return;const h=l(),w=i?.();if(!(!!h?.session&&!!h?.profile?.role&&!!w)){p(x.CTX_NOT_READY,{ok:!1,epoch:Number(c()||0),retryAfterMs:250,why:"profile_or_restaurant_not_ready"});return}const b=(await a())?.userId||null;if(!b){p(m,{reqId:g,ok:!1,error:"no_session"});return}if(String(b)!==String(f.userId)){p(m,{reqId:g,ok:!1,error:"forbidden_user"});return}const B=Number(o?.desiredTier||3),L=B===1?1:B===2?2:3,k=await s({userId:f.userId,restaurantId:f.restaurantId,desiredTier:L});p(m,{reqId:g,ok:!0,tierToServe:k?.tierToServe??1,reasons:k?.reasons||[],reasonsHuman:k?.reasonsHuman||[],snapshot:k?.snapshot||null})}}function Pl(e){const t=String(e?.code||""),n=String(e?.message||"");return t==="42P01"||/does not exist|undefined table/i.test(n)}function Dl(e,t="restaurant"){return String(e).trim().toLowerCase()||t}function Ol({targetUserId:e=null,waiterUserId:t=null,receiver_user_id:n=null,activeProfile:r=null,progressionOwnerUserId:a=null,progressionOwnerRestaurantId:s=null,membership:i=null,restaurantId:l=null}={}){const c=globalThis?.window,o=e||t||n||r?.user_id||a||c?.__BC_PROGRESS_OWNER_USER_ID__||c?.__BC_ACTIVE_WAITER_USER_ID__||null,d=l||r?.restaurant_id||s||c?.__BC_ACTIVE_WAITER_RESTAURANT_ID__||null;return{userId:o,restaurantId:d}}async function $l({supabase:e,ctx:t,scopeType:n,scopeId:r,body:a,payload:s}){const i={scope_type:n,scope_id:r,restaurant_id:t.restaurantId,sender_user_id:t.userId,receiver_user_id:t.userId,sender_role:t.membershipRole||t.role||"waiter",type:"progress_report",body:a,payload:s},{data:l,error:c}=await e.from("bc_messages_v1").select("id").eq("restaurant_id",t.restaurantId).eq("sender_user_id",t.userId).eq("receiver_user_id",t.userId).eq("type","progress_report").is("archived_at",null).order("created_at",{ascending:!1}).limit(1).maybeSingle();if(c)return{ok:!1,error:c.message||String(c),inserted:0};if(l?.id){const{error:d}=await e.from("bc_messages_v1").update(i).eq("id",l.id);return d?{ok:!1,error:d.message||String(d),inserted:0}:{ok:!0,inserted:0,updated:!0}}const{error:o}=await e.from("bc_messages_v1").insert(i);return o?{ok:!1,error:o.message||String(o),inserted:0}:{ok:!0,inserted:1,updated:!1}}async function Ul({supabase:e,ctx:t,payload:n}){const r=n||{},a=r?.skills||{},{error:s}=await e.from("bc_skill_snapshots_v1").insert({user_id:t.userId,restaurant_id:t.restaurantId,scope_id:t.scopeId||null,encounter_number:r?.encounterNumber??null,guest_state:r?.guestStateActual??null,difficulty:Number.isFinite(Number(r?.difficulty))?Math.round(Number(r.difficulty)):null,chain_signal:r?.chainSignal??null,chain_score:r?.chainScore??null,read_pct:a.read??0,framing_pct:a.framing??0,delivery_pct:a.delivery??0,recovery_pct:a.recovery??0,closing_pct:a.closing??0,strongest_skill:r?.strongestSkill??null,weakest_skill:r?.weakestSkill??null,payload:r});if(s)return console.warn("[SNAPSHOT] parent insert failed",s),{ok:!1,error:s.message||String(s)};console.log("[SNAPSHOT] parent insert success ✅",{userId:t.userId,restaurantId:t.restaurantId,encounterNumber:r?.encounterNumber});try{const{data:i,error:l}=await e.from("bc_drill_runs_v1").select("id, focus, completed_at, effectiveness_delta").eq("user_id",t.userId).eq("restaurant_id",t.restaurantId).eq("completed",!0).is("effectiveness_delta",null).order("completed_at",{ascending:!1}).limit(1).maybeSingle();if(l||!i?.id||!i?.focus)return{ok:!0};const o={read:"read",frame:"framing",framing:"framing",delivery:"delivery",recovery:"recovery",closing:"closing"}[String(i.focus||"").toLowerCase()]||null,d=o?Number(a?.[o]||0):null;if(!o||d==null)return{ok:!0};const{data:p,error:m}=await e.from("bc_skill_snapshots_v1").select("read_pct, framing_pct, delivery_pct, recovery_pct, closing_pct, created_at").eq("user_id",t.userId).eq("restaurant_id",t.restaurantId).lt("created_at",i.completed_at).order("created_at",{ascending:!1}).limit(1).maybeSingle();if(m||!p)return{ok:!0};const g={read:Number(p.read_pct||0),framing:Number(p.framing_pct||0),delivery:Number(p.delivery_pct||0),recovery:Number(p.recovery_pct||0),closing:Number(p.closing_pct||0)},u=Number(g[o]||0),f=d-u,h=f>0?`${o} improved +${f}% after ${i.focus} drill`:f<0?`${o} changed ${f}% after ${i.focus} drill`:`${o} stayed flat after ${i.focus} drill`,{error:w}=await e.from("bc_drill_runs_v1").update({effectiveness_delta:f,effectiveness_note:h}).eq("id",i.id);if(w)return console.warn("[DRILL EFFECT] update failed",w),{ok:!0};console.log("[DRILL EFFECT] updated ✅",{drillRunId:i.id,delta:f,note:h});const{error:S}=await e.from("bc_messages_v1").insert({scope_type:"restaurant",scope_id:t.restaurantId,restaurant_id:t.restaurantId,sender_user_id:t.userId,receiver_user_id:t.userId,sender_role:"system",type:"drill_effectiveness",body:h,payload:{drillRunId:i.id,focus:i.focus,delta:f,skillKey:o}});S&&console.warn("[DRILL EFFECT] insight message insert failed",S)}catch(i){console.warn("[DRILL EFFECT] exception",i)}return{ok:!0}}async function Hl({supabase:e,ctx:t,payload:n,authUserId:r=null}){const a=n?.progressionState||n?.progression_state||null;if(!a||typeof a!="object")return{ok:!1,skipped:!0,reason:"missing_progression_state"};const s=g=>{const u=Object.values(g?.rewards?.encounters||g?.run?.scoredThisRun||{}),f=Object.values(g?.rewards?.drills||{}),h=Object.values(g?.rewards?.timedChallenges||{}),w=Object.values(g?.rewards?.premiumByEncounter||{}),S=b=>b.reduce((B,L)=>B+Number(L?.rewardPoints||L?.reward?.totalPoints||0),0),E=b=>{const B=Number(b||0);return Math.max(0,Math.round(B*10)/10)};return{encounters:{count:u.length,totalPoints:E(S(u))},drills:{count:f.length,totalPoints:E(S(f))},timedChallenges:{count:h.length,totalPoints:E(S(h))},premium:{count:w.length,totalPoints:E(S(w))}}},i={...a,rewardsSummary:a?.rewardsSummary&&typeof a.rewardsSummary=="object"?a.rewardsSummary:s(a)},l=globalThis?.appState?.session||null,c=globalThis?.appState?.profile||null,{userId:o,restaurantId:d}=Ol({targetUserId:n?.targetUserId||null,waiterUserId:n?.waiterUserId||null,receiver_user_id:n?.receiver_user_id||null,activeProfile:n?.activeProfile||null,progressionOwnerUserId:t?.progressionOwnerUserId||null,progressionOwnerRestaurantId:t?.progressionOwnerRestaurantId||null,membership:n?.membership||null,restaurantId:n?.restaurantId||n?.restaurant_id||t?.progressionOwnerRestaurantId||null});if(console.log("[BC progression upsert target]",{authUserId:l?.user?.id||r||null,authProfileUserId:c?.user_id||null,progressionOwnerUserId:o,progressionOwnerRestaurantId:d,canonicalPoints:i?.economy?.points??null,rewardsSummary:i?.rewardsSummary??null}),!o||!d)throw console.warn("[BC progression upsert] missing owner identity",{authUserId:l?.user?.id||r||null,authProfileUserId:c?.user_id||null,progressionOwnerUserId:o,progressionOwnerRestaurantId:d,ctx:t,payload:n}),new Error("Missing waiter-owned progression target");const p={user_id:o,restaurant_id:d,scope_id:t.scopeId||null,canonical_state:i,source_type:"progress_report",updated_at:new Date().toISOString()},{error:m}=await e.from("bc_progression_state_v1").upsert(p,{onConflict:"user_id,restaurant_id"});return m?Pl(m)?(console.warn("[PROGRESSION STATE] dedicated table missing, using snapshot payload fallback"),{ok:!1,skipped:!0,reason:"missing_table"}):(console.warn("[PROGRESSION STATE] upsert failed",m),{ok:!1,error:m.message||String(m)}):{ok:!0}}function Gl({supabase:e,getSourceCtx:t,isDemoMsg:n,rejectIfEpochMismatch:r,getSenderCtxOrReject:a,getLiveAuthOrNull:s}){if(!e)throw new Error("makeProgressReportSubmitHandler: supabase required");if(!t)throw new Error("makeProgressReportSubmitHandler: getSourceCtx required");if(!n)throw new Error("makeProgressReportSubmitHandler: isDemoMsg required");if(!r)throw new Error("makeProgressReportSubmitHandler: rejectIfEpochMismatch required");if(!a)throw new Error("makeProgressReportSubmitHandler: getSenderCtxOrReject required");if(!s)throw new Error("makeProgressReportSubmitHandler: getLiveAuthOrNull required");return async({msg:i,event:l,reply:c})=>{const o=i?.reqId||null,d=x.PROGRESS_REPORT_SUBMIT_RESULT,p=t(l.source);if(n(i,p)){c(d,{reqId:o,ok:!0,demo:!0,inserted:0});return}if(r(l,i,d,{reqId:o,inserted:0}))return;const m=a(l,p,d,{reqId:o,inserted:0},{requireRestaurant:!0,allowedRoles:["waiter","single_manager","group_manager","enterpriser"]});if(!m)return;const u=(await s())?.userId||null;if(!u){c(d,{reqId:o,ok:!1,inserted:0,error:"no_session"});return}if(String(u)!==String(m.userId)){c(d,{reqId:o,ok:!1,inserted:0,error:"forbidden_user"});return}const f=Dl(i?.scope_type||m.scopeType||"restaurant","restaurant"),h=i?.scope_id||m.scopeId||m.restaurantId,w=String(i?.body||"Progress report").slice(0,2e3),S=i?.payload??null;try{const E={...S||{},updatedAt:Date.now()},b=await $l({supabase:e,ctx:m,scopeType:f,scopeId:h,body:w,payload:E});if(!b?.ok){c(d,{reqId:o,ok:!1,inserted:0,error:b?.error||"progress_report_write_failed"});return}const B=Number(b?.inserted||0),L=await Hl({supabase:e,ctx:m,payload:E,authUserId:u}),k=await Ul({supabase:e,ctx:m,payload:S});c(d,{reqId:o,ok:!0,inserted:B,updated:!!b?.updated,serverSkillSnapshot:E?.skills&&typeof E.skills=="object"?{read:Number(E.skills.read||0),framing:Number(E.skills.framing||0),delivery:Number(E.skills.delivery||0),recovery:Number(E.skills.recovery||0),closing:Number(E.skills.closing||0)}:null,serverProgressionState:E?.progressionState&&typeof E.progressionState=="object"?E.progressionState:null,syncedEncounterNumber:E?.encounterNumber??null,syncedAt:E?.updatedAt??Date.now(),progressionStateOk:!!L?.ok,progressionStateSkipped:!!L?.skipped,progressionStateError:L?.ok||L?.skipped?null:L?.error||"progression_state_write_failed",snapshotOk:!!k?.ok,snapshotError:k?.ok?null:k?.error||"snapshot_insert_failed"})}catch(E){c(d,{reqId:o,ok:!1,inserted:0,error:E?.message||String(E)})}}}function Wl({getSourceCtx:e,isDemoMsg:t,rejectIfEpochMismatch:n,getSenderCtxOrReject:r,getLiveAuthOrNull:a,hardResetProgressionStateOnly:s}){if(!e)throw new Error("makeHardResetProgressionHandler: getSourceCtx required");if(!t)throw new Error("makeHardResetProgressionHandler: isDemoMsg required");if(!n)throw new Error("makeHardResetProgressionHandler: rejectIfEpochMismatch required");if(!r)throw new Error("makeHardResetProgressionHandler: getSenderCtxOrReject required");if(!a)throw new Error("makeHardResetProgressionHandler: getLiveAuthOrNull required");if(!s)throw new Error("makeHardResetProgressionHandler: hardResetProgressionStateOnly required");return async({msg:i,event:l,reply:c})=>{const o=i?.reqId||null,d=x.HARD_RESET_PROGRESSION_RESULT,p=e(l.source);if(t(i,p)){c(d,{reqId:o,ok:!1,resetMode:"progression_only",error:"demo_not_supported"});return}if(n(l,i,d,{reqId:o,resetMode:"progression_only"}))return;const m=r(l,p,d,{reqId:o,resetMode:"progression_only"},{requireRestaurant:!0,allowedRoles:["waiter","single_manager","group_manager","enterpriser"]});if(!m)return;const u=(await a())?.userId||null;if(!u){c(d,{reqId:o,ok:!1,resetMode:"progression_only",error:"no_session"});return}if(String(u)!==String(m.userId)){c(d,{reqId:o,ok:!1,resetMode:"progression_only",error:"forbidden_user"});return}const f=i?.userId||m?.progressionOwnerUserId||m?.userId||null,h=i?.restaurantId||m?.progressionOwnerRestaurantId||m?.restaurantId||null;if(String(f||"")!==String(m.userId||"")){c(d,{reqId:o,ok:!1,resetMode:"progression_only",error:"forbidden_target_user"});return}if(String(h||"")!==String(m.restaurantId||"")){c(d,{reqId:o,ok:!1,resetMode:"progression_only",error:"forbidden_target_restaurant"});return}try{const w=await s({userId:f,restaurantId:h,scopeId:m?.scopeId||null});c(d,{reqId:o,ok:!0,...w})}catch(w){c(d,{reqId:o,ok:!1,resetMode:"progression_only",userId:f,restaurantId:h,error:w?.message||String(w)})}}}const oi="bc_tournament_bridge_v1";function Ce(e){return e==null?e:structuredClone(e)}function Fl(e){try{const t=e?.getItem?.(oi);if(!t)return{definitions:{},runtimes:{}};const n=JSON.parse(t);return{definitions:n?.definitions&&typeof n.definitions=="object"?n.definitions:{},runtimes:n?.runtimes&&typeof n.runtimes=="object"?n.runtimes:{}}}catch{return{definitions:{},runtimes:{}}}}function ql(e,t){try{e?.setItem?.(oi,JSON.stringify(t))}catch{}}function jl(e=globalThis?.window?.localStorage){let t=Fl(e);function n(r){return t=r,ql(e,t),t}return{getState(){return t},getDefinition(r){return t.definitions?.[r]||null},getRuntime(r){return t.runtimes?.[r]||null},put(r,a){const s={definitions:{...t.definitions,[r.tournamentId]:Ce(r)},runtimes:{...t.runtimes,[r.tournamentId]:Ce(a)}};return n(s),{definition:s.definitions[r.tournamentId],runtime:s.runtimes[r.tournamentId]}},updateRuntime(r,a){const s=t.runtimes?.[r]||null,i=a(Ce(s)),l={...t,runtimes:{...t.runtimes,[r]:Ce(i)}};return n(l),l.runtimes[r]}}}function Vl(e,t=null){const n=String(t||"").trim();if(n)return n;const r=Object.entries(e.runtimes||{}),a=r.find(([,i])=>i?.status==="active");if(a)return a[0];const s=r.find(([,i])=>i?.status==="ready");return s?s[0]:Object.keys(e.definitions||{})[0]||null}function Kl(e){return{tournamentId:e,status:"ready",currentEntryIndex:0,startedAt:null,completedAt:null,activeEntry:null,restore:null,results:[],totals:{entriesPlayed:0,wins:0,losses:0,totalScore:0}}}function Yl(e){return e==null||["easy","normal","hard"].includes(String(e))}function zl(e,t){if(!e||String(e.status||"")!=="active")throw new Error("Tournament is not active.");if(!e.activeEntry)throw new Error("Tournament has no active entry.");const n=String(e.activeEntry.entryId||""),r=String(e.activeEntry.encounterRunId||""),a=String(t?.entryId||""),s=String(t?.runId||"");if(!n||!r)throw new Error("Tournament active entry identity is incomplete.");if(a!==n)throw new Error(`Tournament entryId mismatch. Expected ${n}, got ${a}.`);if(s!==r)throw new Error(`Tournament runId mismatch. Expected ${r}, got ${s}.`)}function Ql(e,t){if(!e||String(e.status||"")!=="active")throw new Error("Tournament is not active.");if(!e.activeEntry)throw new Error("Tournament has no active entry.");const n=String(e.activeEntry.encounterRunId||""),r=String(e.activeEntry.encounterId||""),a=String(t?.runId||""),s=String(t?.encounterId||"");if(!n||!r)throw new Error("Tournament active entry restore identity is incomplete.");if(a!==n)throw new Error(`Tournament checkpoint runId mismatch. Expected ${n}, got ${a}.`);if(s!==r)throw new Error(`Tournament checkpoint encounterId mismatch. Expected ${r}, got ${s}.`)}function Jl(e,t,n=1){return`${String(e||"tournament")}::${Number(t||0)}::run_${Number(n||1)}`}function Es(e,t=Date.now()){const n=Math.max(60,Number(e?.timerSec||300)||300);return{startedAt:t,expiresAt:t+n*1e3,durationSec:n}}function Rs(e,t,n){const r=String(e?.tournamentId||""),a=Number(t?.currentEntryIndex||0)||0,s=Jl(r,a,1),i=String(e?.rules?.sharedSeed||"").trim()||r||"tournament_seed",l=String(n?.kind||"encounter"),c={entryId:String(n?.entryId||""),kind:l,encounterId:String(l==="encounter"?n?.encounterId||"":n?.baseEncounterId||""),encounterRunId:s,seed:`${i}::${a}::${String(n?.entryId||"")}`,timer:null,challengeMeta:null};return l==="timed_challenge"&&(c.timer=Es(n),c.challengeMeta={challengeKey:n?.challengeKey||null,placement:n?.placement||"before_start",title:n?.title||"Timed Challenge"}),l==="display_method_challenge"&&(c.timer=Es(n),c.challengeMeta={challengeKey:n?.challengeKey||null,placement:n?.placement||"before_start",strictness:n?.strictness||"normal",methodKey:n?.methodKey||null,title:n?.title||"Display Method Challenge"}),c}function Xl(e){if(!e||!e.activeEntry)return e;const t=e.restore;if(!t||typeof t!="object")return e;const n=String(e.activeEntry.encounterRunId||""),r=String(e.activeEntry.encounterId||""),a=String(t?.runId||""),s=String(t?.encounterId||"");return n&&a&&n!==a?{...e,restore:null}:r&&s&&r!==s?{...e,restore:null}:e}function Zl(e,t){if(!e||typeof e!="object")return"missing_definition";if(!String(e.tournamentId||"").trim())return"missing_tournament_id";if(!["demo","premium","drill"].includes(String(e.mode||"")))return"invalid_mode";if(!Array.isArray(e.entries)||!e.entries.length)return"missing_entries";const n=new Set;for(const r of e.entries){const a=String(r?.entryId||"").trim();if(!a)return"missing_entry_id";if(n.has(a))return"duplicate_entry_id";n.add(a);const s=String(r?.kind||"");if(!["encounter","timed_challenge","display_method_challenge"].includes(s))return"invalid_entry_kind";const i=s==="encounter"?r?.encounterId:r?.baseEncounterId;if(!String(i||"").trim())return"missing_encounter_id";if(!t(String(i)))return`unknown_encounter:${i}`;if((s==="timed_challenge"||s==="display_method_challenge")&&!String(r?.challengeKey||"").trim())return"missing_challenge_key";if(r?.timerSec!=null&&Number(r.timerSec)<60)return"invalid_timer_sec";if(s==="display_method_challenge"&&!Yl(r?.strictness))return"invalid_strictness"}return null}function ec({resolveEncounterById:e,getIframeEpoch:t}){if(typeof e!="function")throw new Error("makeTournamentHandlers: resolveEncounterById required");if(typeof t!="function")throw new Error("makeTournamentHandlers: getIframeEpoch required");const n=jl();function r(p,m,g,u={}){p(m,{requestId:g||null,epoch:Number(t()||0),payload:u})}function a(p,m,g,u,f={}){p(m,{requestId:g||null,epoch:Number(t()||0),payload:{ok:!1,error:String(u||"unknown_error"),...f}})}function s(p){const m=Vl(n.getState(),p);return m?{tournamentId:m,definition:n.getDefinition(m),runtime:n.getRuntime(m)}:{tournamentId:null,definition:null,runtime:null}}function i(p,m){return n.updateRuntime(p,()=>Ce(m))}function l(p){return n.getDefinition(p)}function c(p){return n.getRuntime(p)}function o(p={}){const m=String(p?.tournamentId||"").trim(),g=Ce(p?.completedEntry||null);if(!m)throw new Error("Tournament id is required.");const u=l(m),f=c(m);if(!u)throw new Error(`Tournament definition not found for ${m}.`);if(!f)throw new Error(`Tournament runtime not found for ${m}.`);zl(f,g);const h=Array.isArray(u?.entries)?u.entries:[],w=Number(f.currentEntryIndex||0)+1,S=[...Array.isArray(f.results)?f.results:[],g],E=f?.totals||{entriesPlayed:0,wins:0,losses:0,totalScore:0},b={...f,restore:null,lastCompletedEntry:{...g},results:S,totals:{entriesPlayed:Number(E.entriesPlayed||0)+1,wins:Number(E.wins||0)+(g?.outcome==="win"?1:0),losses:Number(E.losses||0)+(g?.outcome==="win"?0:1),totalScore:Number(E.totalScore||0)+(Number(g?.score||0)||0)}};if(w>=h.length)return b.status="complete",b.currentEntryIndex=w,b.activeEntry=null,b.completedAt=Date.now(),i(m,b),{definition:u,runtime:b};const B=h[w];return b.status="active",b.currentEntryIndex=w,b.activeEntry=Rs(u,{...b,currentEntryIndex:w},B),i(m,b),{definition:u,runtime:b}}function d(p={}){const m=String(p?.tournamentId||"").trim(),g=Ce(p?.restore||null);if(!m)throw new Error("Tournament id is required.");const u=l(m),f=c(m);if(!u)throw new Error(`Tournament definition not found for ${m}.`);if(!f)throw new Error(`Tournament runtime not found for ${m}.`);if(String(f.status||"")!=="active")throw new Error("Tournament is not active.");if(!f.activeEntry)throw new Error("Tournament has no active entry.");Ql(f,g);const h={...f,restore:{...g&&typeof g=="object"?g:{},checkpointedAt:Date.now()}};return i(m,h),{definition:u,runtime:h}}return{[x.TOURNAMENT_CREATE]:async({msg:p,reply:m})=>{const g=p?.requestId||null,u=Ce(p?.payload?.definition||null),f=Zl(u,e);if(f){a(m,x.TOURNAMENT_CREATED,g,f);return}const h=Kl(u.tournamentId),w=n.put(u,h);r(m,x.TOURNAMENT_CREATED,g,{ok:!0,tournamentId:w.definition.tournamentId,version:Number(w.definition.version||1)})},[x.TOURNAMENT_SNAPSHOT]:async({msg:p,reply:m})=>{const g=p?.requestId||null,u=p?.payload?.tournamentId||null,f=s(u);if(!f.definition||!f.runtime){a(m,x.TOURNAMENT_SNAPSHOT_RESULT,g,"tournament_not_found");return}r(m,x.TOURNAMENT_SNAPSHOT_RESULT,g,{definition:f.definition,runtime:f.runtime})},[x.TOURNAMENT_START]:async({msg:p,reply:m})=>{const g=p?.requestId||null,u=p?.payload?.tournamentId||null,f=s(u);if(!f.definition||!f.runtime){a(m,x.TOURNAMENT_STARTED,g,"tournament_not_found");return}if(!["ready","draft"].includes(String(f.runtime.status||""))){a(m,x.TOURNAMENT_STARTED,g,"tournament_not_ready");return}const h=Rs(f.definition,{...Ce(f.runtime),currentEntryIndex:0},f.definition.entries[0]),w=n.updateRuntime(f.definition.tournamentId,()=>({...Ce(f.runtime),status:"active",currentEntryIndex:0,startedAt:Date.now(),completedAt:null,activeEntry:h,restore:null}));r(m,x.TOURNAMENT_STARTED,g,{runtime:w})},[x.TOURNAMENT_ADVANCE]:async({msg:p,reply:m})=>{const g=p?.requestId||null;try{const u=o(p?.payload||{});r(m,x.TOURNAMENT_ADVANCED,g,u)}catch(u){a(m,x.TOURNAMENT_ADVANCED,g,u?.message||String(u||"Unknown error"))}},[x.TOURNAMENT_RESTORE]:async({msg:p,reply:m})=>{const g=p?.requestId||null,u=p?.payload?.tournamentId||null,f=s(u);if(!f.definition||!f.runtime){a(m,x.TOURNAMENT_RESTORED,g,"tournament_not_found");return}const h=Xl(f.runtime);h!==f.runtime&&i(f.definition.tournamentId,h),r(m,x.TOURNAMENT_RESTORED,g,{definition:f.definition,runtime:h})},[x.TOURNAMENT_CHECKPOINT]:async({msg:p,reply:m})=>{const g=p?.requestId||null;try{const u=d(p?.payload||{});r(m,x.TOURNAMENT_CHECKPOINT_RESULT,g,u)}catch(u){a(m,x.TOURNAMENT_CHECKPOINT_RESULT,g,u?.message||String(u||"checkpoint_invalid"))}}}}async function tc({msg:e,event:t,supabase:n,tagSource:r,ctx:a,replyType:s="event_log_ack"}){function i(o){const d=String(o?.code||"").toUpperCase(),p=String(o?.message||"").toLowerCase();return d==="42P01"||d==="42703"||p.includes("does not exist")||p.includes("relation")||p.includes("schema cache")||p.includes("column")||p.includes("could not find")}function l(o){const d=String(o?.message||""),p=d.match(/Could not find the '([^']+)' column/i)||d.match(/column "?([^"\s]+)"? does not exist/i);return p?.[1]?String(p[1]):null}async function c({payload:o={},eventId:d=null,userId:p=null,restaurantId:m=null,occurredAt:g=null}={}){const u=o||{},f=u.checks||{},h=u.pivot||{},w=u.chosen||{},S=u.actual||{},E=u.performanceGrade??u.performance_grade??null,b=u.chainScore??u.chain_score??null,B=u.chainSignal??u.chain_signal??null,L=f.modeStatus??u.modeStatus??u.mode_status??null,k=f.hookStatus??u.hookStatus??u.hook_status??null,v=f.readCorrect??u.guestReadCorrect??u.readCorrect??u.read_correct??null,R=f.deliveryCorrect??u.deliveryCorrect??u.delivery_correct??null,T=S.guestTypeNorm??u.actualGuestTypeNorm??u.actual_guest_type_norm??u.actualGuestType??u.actual_guest_type??null,A=w.guestTypeNorm??u.chosenGuestTypeNorm??u.chosen_guest_type_norm??w.guestType??u.chosenGuestType??u.chosen_guest_type??null,W=[{table:"bc_encounter_resolutions_v2",row:{event_id:d,user_id:p,restaurant_id:m,occurred_at:g,actual_guest_type_norm:T,chain_score:b,is_green:E==="green",is_red:E==="red",read_correct:v,delivery_correct:R,mode_optimal:L==="right",hook_optimal:k==="right",mode_status:L,hook_status:k,chain_signal:B,performance_grade:E,pivot_type:h.type??null,pivot_taken:!!h.taken,pivot_success:!!h.success,recovery_choice:w.mode??null,recovery_correct:!!h.success,tier:u.tier??null,encounter_number:u.encounterNumber??u.encounter_number??null,session_id:u.sessionId??u.session_id??null}},{table:"bc_encounter_resolutions_v1",row:{event_id:d,user_id:p,restaurant_id:m,occurred_at:g,encounter_id:u.encounterId??u.encounter_id??null,encounter_number:u.encounterNumber??u.encounter_number??null,session_id:u.sessionId??u.session_id??null,role:u.role??null,guest_state_actual:T,guest_read:A,mode_selected:w.mode??u.chosenMode??u.chosen_mode??null,hook_selected:w.hook??u.chosenHook??u.chosen_hook??null,delivery_correct:R,chain_score:b,chain_signal:B,outcome:u.outcome??B??null,score:u.score??b??null,pivot_type:h.type??null,pivot_taken:!!h.taken,pivot_success:!!h.success,recovery_choice:w.mode??null,recovery_correct:!!h.success}},{table:"bc_encounter_resolutions",row:{event_id:d,user_id:p,restaurant_id:m,occurred_at:g,encounter_id:u.encounterId??u.encounter_id??null,encounter_number:u.encounterNumber??u.encounter_number??null,session_id:u.sessionId??u.session_id??null,role:u.role??null,guest_state_actual:T,guest_read:A,mode_selected:w.mode??u.chosenMode??u.chosen_mode??null,hook_selected:w.hook??u.chosenHook??u.chosen_hook??null,delivery_correct:R,chain_score:b,chain_signal:B,outcome:u.outcome??B??null,score:u.score??b??null,pivot_type:h.type??null,pivot_taken:!!h.taken,pivot_success:!!h.success,recovery_choice:w.mode??null,recovery_correct:!!h.success}}];let H=null;for(const{table:P,row:C}of W){let D={...C};for(let V=0;V<8;V+=1){const M=await n.from(P).upsert([D],{onConflict:"event_id"});if(!M.error)return{ok:!0,table:P};if(H=M.error,!i(M.error))break;const N=l(M.error);if(!N||!(N in D))break;console.warn("[BC] encounter_resolutions retry without missing column",{table:P,missingColumn:N}),delete D[N]}}return{ok:!1,error:H}}try{const{eventType:o,payload:d}=e||{};if(!o)return;if(!a?.userId||!a?.restaurantId){t.source?.postMessage({source:"BC_MSG",v:1,type:s,ok:!1,error:"missing_ctx_param"},t.origin);return}const p=a.userId,m=a.restaurantId;console.log("[BC] event_log from",r?.(t.source),a);const g=String(d?.eventId||crypto.randomUUID()),u=d?.occurredAt||d?.occurred_at||new Date().toISOString(),f={event_id:g,user_id:p,restaurant_id:m,event_type:String(o),payload:d||{},occurred_at:u},h=await n.from("bc_event_log").upsert(f,{onConflict:"event_id"});if(h.error)throw h.error;if(o==="encounter_resolved"){const w=await c({payload:d||{},eventId:g,userId:p,restaurantId:m,occurredAt:u});w.ok||console.warn("[BC] encounter_resolutions upsert failed",w.error)}t.source?.postMessage({source:"BC_MSG",v:1,type:s,ok:!0,eventType:o},t.origin)}catch(o){console.error("[BC] event_log handler failed:",o);try{t.source?.postMessage({source:"BC_MSG",v:1,type:s,ok:!1,error:String(o?.message||o)},t.origin)}catch{}}}const li=["guide","charm","authority"];function Ke(e){const t=Number(e||0);return t>=10?3:t>=5?2:1}function Xt(e){const t=Number(e||0),n=Ke(t),r=["dictator","bargain_smart","griever"];return n>=2&&r.push("fancy"),n>=3&&r.push("celebrator"),r}function Is(e){const t=Ke(e);return t===1?[1,5]:t===2?[1,12]:[1,20]}function nc(e){return li.slice()}function rc(e){return nc()}function ac(){return li.slice()}function sc(e){switch(String(e||"").toLowerCase()){case"drill":return 1;case"encounter":return 1;case"timed_challenge":return 2;default:return 1}}function ic(e){const t=Number(e||1);return t>=3?1.5:t===2?1.25:1}function oc(e){const t=Number(e||0);return!Number.isFinite(t)||t<=0?1:t>=8?1.2:t>=5?1.1:1}function lc(e){const t=Number(e||0);return!Number.isFinite(t)||t<=0?1:t>=3?1.1:t>=2?1.05:1}function cc(e){switch(String(e||"").toLowerCase()){case"mastered":return 1.25;case"passed":return 1;case"completed":return 0;default:return 1}}function dc(e){switch(String(e||"").toLowerCase()){case"tournament":return 1.5;case"timed_challenge":return 1.25;default:return 1}}function uc(e){const t=Number(e||0);return Math.max(0,Math.round(t*10)/10)}function ir(e){const t=Number(e||0);return Math.round(t*10)/10}function Zt(e){return ir((e||[]).reduce((t,n)=>t+Number(n?.rewardPoints||n?.reward?.totalPoints||0),0))}function Qn({activityType:e,tier:t=1,effectiveDifficulty:n=null,pressureLevel:r=null,qualityState:a="passed",competitionType:s="normal",premiumBonus:i=0}={}){const l=sc(e),c=ic(t),o=oc(n),d=lc(r),p=cc(a),m=dc(s),g=l*c*o*d*p*m,u=uc(g+Number(i||0));return{activityType:e,tier:Number(t||1),effectiveDifficulty:Number.isFinite(Number(n))?Number(n):null,pressureLevel:Number.isFinite(Number(r))?Number(r):null,qualityState:a,competitionType:s,baseReward:l,tierMultiplier:c,difficultyMultiplier:o,pressureMultiplier:d,qualityMultiplier:p,competitionMultiplier:m,premiumBonus:Number(i||0),rawValue:g,totalPoints:u}}function mc({repsDone:e,repTarget:t,accuracy:n=null,qualityScore:r=null}={}){const a=Number(e||0),s=Number(t||0);if(!(s>0&&a>=s))return"completed";const l=Number.isFinite(Number(n))?Number(n):Number(r);return Number.isFinite(l)?l>=.9?"mastered":l>=.7?"passed":"completed":"completed"}function gc({performanceGrade:e,success:t}={}){if(!t)return"completed";const n=String(e||"").toUpperCase();return n==="A"?"mastered":n==="B"?"passed":"completed"}function pc(e={}){const t=Object.values(e?.rewards?.encounters||e?.run?.scoredThisRun||{}),n=Object.values(e?.rewards?.drills||{}),r=Object.values(e?.rewards?.timedChallenges||{}),a=Object.values(e?.rewards?.premiumByEncounter||{}),s=Object.values(e?.rewards?.legacy||{});return{encounters:{count:t.length,totalPoints:Zt(t)},drills:{count:n.length,totalPoints:Zt(n)},timedChallenges:{count:r.length,totalPoints:Zt(r)},premium:{count:a.length,totalPoints:Zt(a)},legacy:{count:s.length,totalPoints:Zt(s)}}}function _c(e={}){return ir(Number(e?.encounters?.totalPoints||0)+Number(e?.drills?.totalPoints||0)+Number(e?.timedChallenges?.totalPoints||0)+Number(e?.premium?.totalPoints||0)+Number(e?.legacy?.totalPoints||0))}function kt(e){const t=pc(e),n=ir(Number(e?.economy?.points??e?.points??0)),r=_c(t);console.log("[BC progression consistency]",{points:n,summaryTotal:r,delta:ir(n-r),rewardsSummary:t})}function fc(e=window.localStorage){let t=null,n=null;const r=new Set;function a(){r.forEach(v=>v(s()))}function s(){if(!t)throw new Error("Progression store not initialized.");return structuredClone(t)}function i(v){return r.add(v),()=>r.delete(v)}function l(v){return rc()}function c(v,R){const[T,A]=Is(R);return Math.max(T,Math.min(A,v))}function o(){e.setItem(n,JSON.stringify(t))}function d(v){return{version:1,identity:v,points:0,difficulty:{seed:1,lastUpdatedAt:Date.now()},history:{completedEncounterIds:[],successCount:0,failCount:0},session:{currentEncounterId:1,mode:"guide",guestTypeSelected:"dictator",runEase:1,runEaseRemaining:0},run:{runId:0,scoredThisRun:{}},rewards:{encounters:{},timedChallenges:{},drills:{},premiumByEncounter:{}},mirror:{}}}function p(v,R){if(!v||v.version!==1)return d(R);v.identity=R,v.points=Number.isFinite(v.points)?v.points:0,v.difficulty=v.difficulty&&Number.isFinite(v.difficulty.seed)?{seed:v.difficulty.seed,lastUpdatedAt:v.difficulty.lastUpdatedAt||Date.now()}:{seed:1,lastUpdatedAt:Date.now()},v.history=v.history||{},v.history.completedEncounterIds=Array.isArray(v.history.completedEncounterIds)?v.history.completedEncounterIds:[],v.history.successCount=Number.isFinite(v.history.successCount)?v.history.successCount:0,v.history.failCount=Number.isFinite(v.history.failCount)?v.history.failCount:0,v.session=v.session||{},v.session.currentEncounterId=Number.isFinite(v.session.currentEncounterId)?v.session.currentEncounterId:1,v.session.mode=typeof v.session.mode=="string"?v.session.mode:"guide",v.session.guestTypeSelected=typeof v.session.guestTypeSelected=="string"?v.session.guestTypeSelected.toLowerCase().replace("decider","dictator"):"dictator",Number.isFinite(v.session.runEase)||(v.session.runEase=1),Number.isFinite(v.session.runEaseRemaining)||(v.session.runEaseRemaining=0),v.run=v.run||{},v.run.runId=Number.isFinite(v.run.runId)?v.run.runId:0,v.run.scoredThisRun=v.run.scoredThisRun&&typeof v.run.scoredThisRun=="object"?v.run.scoredThisRun:{},v.rewards=v.rewards||{},v.rewards.encounters=v.rewards.encounters&&typeof v.rewards.encounters=="object"?v.rewards.encounters:{},v.rewards.timedChallenges=v.rewards.timedChallenges&&typeof v.rewards.timedChallenges=="object"?v.rewards.timedChallenges:{},v.rewards.drills=v.rewards.drills&&typeof v.rewards.drills=="object"?v.rewards.drills:{},v.rewards.premiumByEncounter=v.rewards.premiumByEncounter&&typeof v.rewards.premiumByEncounter=="object"?v.rewards.premiumByEncounter:{},v.rewards.legacy=v.rewards.legacy&&typeof v.rewards.legacy=="object"?v.rewards.legacy:{},v.mirror=v.mirror&&typeof v.mirror=="object"?v.mirror:{},v.session.currentEncounterId=c(v.session.currentEncounterId,v.points);const T=Xt(v.points);T.includes(v.session.guestTypeSelected)||(v.session.guestTypeSelected=T[0]);const A=l(v.points);return A.includes(v.session.mode)||(v.session.mode=A[0]),v}function m(v){const{email:R,license:T,groupId:A}=v;if(!R||!T)throw new Error("Missing identity.email or identity.license");n=`bottlecaller:progress:v1:${R}|${T}|${A||"solo"}`;const W=e.getItem(n);if(W){const H=JSON.parse(W);t=p(H,v)}else t=d(v),o();return a(),k()}function g(){t.session.currentEncounterId=1,t.session.runEase=.75,t.session.runEaseRemaining=3,o(),a()}function u(){console.log("[PROG] resetRunScoring",{prevRunId:t.run?.runId||0,nextRunId:(t.run?.runId||0)+1}),t.run=t.run||{},t.run.scoredThisRun={},t.run.runId=(t.run.runId||0)+1,o(),a()}function f(v){const R=Math.max(0,Number(v||0));if(!R)return!1;t.points=Number(t.points||0)+R,t.session.currentEncounterId=c(t.session.currentEncounterId,t.points);const T=Xt(t.points);T.includes(t.session.guestTypeSelected)||(t.session.guestTypeSelected=T[0]);const A=l(t.points);return A.includes(t.session.mode)||(t.session.mode=A[0]),!0}function h({encounterId:v,mode:R,guestType:T}){if(v!=null&&(t.session.currentEncounterId=c(v,t.points)),R!=null){const A=l(t.points);t.session.mode=A.includes(R)?R:A[0]}if(T!=null){const A=Xt(t.points);t.session.guestTypeSelected=A.includes(T)?T:A[0]}o(),a()}function w(v){const R=v&&typeof v=="object"?v:null;if(!R)return{ok:!1,reason:"missing"};const T=R.economy&&typeof R.economy=="object"?R.economy:{},A=R.session&&typeof R.session=="object"?R.session:{},W=R.display&&typeof R.display=="object"?R.display:{};Number.isFinite(Number(T.points))&&(t.points=Math.max(0,Math.floor(Number(T.points)))),Number.isFinite(Number(W.difficultySeed))&&(t.difficulty.seed=Math.max(1,Number(W.difficultySeed)),t.difficulty.lastUpdatedAt=Date.now()),Number.isFinite(Number(A.runEase))&&(t.session.runEase=Number(A.runEase)),Number.isFinite(Number(A.runEaseRemaining))&&(t.session.runEaseRemaining=Math.max(0,Number(A.runEaseRemaining))),Number.isFinite(Number(A.currentEncounterId??A.encounterId))?t.session.currentEncounterId=Number(A.currentEncounterId??A.encounterId):Array.isArray(T.encounterRange)&&T.encounterRange.length===2&&(t.session.currentEncounterId=Math.max(Number(T.encounterRange[0]??1),Number(t.session.currentEncounterId??1))),typeof A.mode=="string"&&A.mode.trim()&&(t.session.mode=A.mode.trim().toLowerCase()),typeof A.guestTypeSelected=="string"&&A.guestTypeSelected.trim()&&(t.session.guestTypeSelected=A.guestTypeSelected.trim().toLowerCase()),Number.isFinite(Number(A.runId))&&(t.run.runId=Math.max(t.run.runId||0,Number(A.runId)));const H=R.run&&typeof R.run=="object"?R.run:{};H.scoredThisRun&&typeof H.scoredThisRun=="object"&&(t.run.scoredThisRun=structuredClone(H.scoredThisRun));const P=R.rewards&&typeof R.rewards=="object"?R.rewards:{},C=R.mirror&&typeof R.mirror=="object"?R.mirror:null;return P.encounters&&typeof P.encounters=="object"&&(t.rewards.encounters=structuredClone(P.encounters)),P.drills&&typeof P.drills=="object"&&(t.rewards.drills=structuredClone(P.drills)),P.timedChallenges&&typeof P.timedChallenges=="object"&&(t.rewards.timedChallenges=structuredClone(P.timedChallenges)),P.premiumByEncounter&&typeof P.premiumByEncounter=="object"&&(t.rewards.premiumByEncounter=structuredClone(P.premiumByEncounter)),P.legacy&&typeof P.legacy=="object"&&(t.rewards.legacy=structuredClone(P.legacy)),C&&(t.mirror=structuredClone(C)),t=p(t,t.identity),kt(t),o(),a(),{ok:!0,points:t.points,tier:Ke(t.points)}}function S({encounterId:v,success:R,pointEligible:T,encounterKey:A=null,tier:W=null,effectiveDifficulty:H=null,pressureLevel:P=null,performanceGrade:C=null,premiumAchieved:D=!1}={}){const V=String(v||"").trim(),M=String(A||V||"").trim();if(t.difficulty.lastUpdatedAt=Date.now(),t.run=t.run||{},t.run.scoredThisRun=t.run.scoredThisRun||{},t.rewards||(t.rewards={}),t.rewards.encounters||(t.rewards.encounters={}),R){if(t.history.successCount+=1,V&&!t.history.completedEncounterIds.includes(V)&&t.history.completedEncounterIds.push(V),T&&M&&!t.run.scoredThisRun[M]){const re=Number(W||Ke(Number(t.points||0))),Re=gc({performanceGrade:C,success:R}),ge=Qn({activityType:"encounter",tier:re,effectiveDifficulty:H,pressureLevel:P,qualityState:Re,competitionType:"normal",premiumBonus:D?1:0});console.log("[BC reward output][encounter]",ge),ge.totalPoints>0&&f(ge.totalPoints),t.run.scoredThisRun[M]={rewardedAt:Date.now(),encounterId:V||null,rewardPoints:ge.totalPoints,reward:ge},t.rewards.encounters[M]={rewardedAt:Date.now(),encounterId:V||null,rewardPoints:ge.totalPoints,reward:ge}}t.difficulty.seed=Math.min(10,t.difficulty.seed+.05)}else t.history.failCount+=1,t.difficulty.seed=Math.max(1,t.difficulty.seed-.02);R&&(t.session.runEaseRemaining||0)>0&&(t.session.runEaseRemaining-=1,t.session.runEaseRemaining<=0&&(t.session.runEase=1,t.session.runEaseRemaining=0)),t.session.currentEncounterId=c(t.session.currentEncounterId,t.points);const N=Xt(t.points);N.includes(t.session.guestTypeSelected)||(t.session.guestTypeSelected=N[0]),kt(t),o(),a()}function E({challengeId:v,qualityState:R="passed",tier:T=null,effectiveDifficulty:A=null,pressureLevel:W=null,premiumAchieved:H=!1}={}){const P=String(v||"").trim();if(!P)return{ok:!1,reason:"missing_challenge_id",points:Number(t.points||0)};if(t.rewards=t.rewards||{},t.rewards.timedChallenges=t.rewards.timedChallenges||{},t.rewards.timedChallenges[P])return{ok:!0,duplicate:!0,points:Number(t.points||0),reward:t.rewards.timedChallenges[P]?.reward||null};const C=Number(T||Ke(Number(t.points||0))),D=Qn({activityType:"timed_challenge",tier:C,effectiveDifficulty:A,pressureLevel:W,qualityState:R||"passed",competitionType:"timed_challenge",premiumBonus:H?1:0});return console.log("[BC reward output][timed_challenge]",D),D.totalPoints>0&&f(D.totalPoints),t.rewards.timedChallenges[P]={challengeId:P,qualityState:R||"passed",rewardedAt:Date.now(),rewardPoints:D.totalPoints,reward:D},kt(t),o(),a(),{ok:!0,duplicate:!1,points:Number(t.points||0),reward:D}}function b({challengeId:v,qualityState:R="passed",tier:T=null,effectiveDifficulty:A=null,pressureLevel:W=null,premiumAchieved:H=!1}={}){const P=String(v||"").trim();if(!P)return{ok:!1,reason:"missing_challenge_id",points:Number(t.points||0)};if(t.rewards=t.rewards||{},t.rewards.displayMethodChallenges=t.rewards.displayMethodChallenges||{},t.rewards.displayMethodChallenges[P])return{ok:!0,duplicate:!0,points:Number(t.points||0),reward:t.rewards.displayMethodChallenges[P]?.reward||null};const C=Number(T||Ke(Number(t.points||0))),D=Qn({activityType:"display_method_challenge",tier:C,effectiveDifficulty:A,pressureLevel:W,qualityState:R||"passed",competitionType:"display_method_challenge",premiumBonus:H?1:0});return console.log("[BC reward output][display_method_challenge]",D),D.totalPoints>0&&f(D.totalPoints),t.rewards.displayMethodChallenges[P]={challengeId:P,qualityState:R||"passed",rewardedAt:Date.now(),rewardPoints:D.totalPoints,reward:D},kt(t),o(),a(),{ok:!0,duplicate:!1,points:Number(t.points||0),reward:D}}function B({assignedMessageId:v,repsDone:R,repTarget:T,accuracy:A=null,qualityScore:W=null,tier:H=null,effectiveDifficulty:P=null,pressureLevel:C=null}={}){const D=String(v||"").trim();if(!D)return{ok:!1,reason:"missing_assigned_message_id",points:Number(t.points||0)};if(t.rewards=t.rewards||{},t.rewards.drills=t.rewards.drills||{},t.rewards.drills[D])return{ok:!0,duplicate:!0,points:Number(t.points||0),reward:t.rewards.drills[D]?.reward||null};const V=Number(H||Ke(Number(t.points||0))),M=mc({repsDone:R,repTarget:T,accuracy:A,qualityScore:W}),N=Qn({activityType:"drill",tier:V,effectiveDifficulty:P,pressureLevel:C,qualityState:M,competitionType:"normal",premiumBonus:0});return console.log("[BC reward output][drill]",N),N.totalPoints>0&&f(N.totalPoints),t.rewards.drills[D]={assignedMessageId:D,repsDone:Number(R||0),repTarget:Number(T||0),accuracy:Number.isFinite(Number(A))?Number(A):null,qualityScore:Number.isFinite(Number(W))?Number(W):null,qualityState:M,rewardedAt:Date.now(),rewardPoints:N.totalPoints,reward:N},kt(t),o(),a(),{ok:!0,duplicate:!1,points:Number(t.points||0),reward:N}}function L({encounterId:v,bonusPoints:R=1}){const T=String(v||"").trim(),A=Math.max(0,Number(R||0));return T?A?(t.rewards=t.rewards||{},t.rewards.premiumByEncounter=t.rewards.premiumByEncounter||{},t.rewards.premiumByEncounter[T]?{ok:!0,duplicate:!0,points:Number(t.points||0)}:(f(A),t.rewards.premiumByEncounter[T]={encounterId:T,rewardPoints:A,rewardedAt:Date.now()},kt(t),o(),a(),{ok:!0,duplicate:!1,points:Number(t.points||0)})):{ok:!1,reason:"no_bonus_points",points:Number(t.points||0)}:{ok:!1,reason:"missing_encounter_id",points:Number(t.points||0)}}function k(){return{subscribe:i,getState:s,selectors:{tier:()=>Ke(t.points),points:()=>t.points,difficultySeed:()=>t.difficulty.seed,effectiveDifficultySeed:()=>t.difficulty.seed*(t.session.runEase||1),runEase:()=>t.session.runEase||1,runEaseRemaining:()=>t.session.runEaseRemaining||0,guestTypes:()=>Xt(t.points),tones:()=>ac(),modes:()=>l(t.points),encounterRange:()=>Is(t.points)},actions:{resetEncounterFlow:g,resetRunScoring:u,setSessionSelection:h,hydrateFromCanonicalState:w,applyEncounterResult:S,applyTimedChallengeReward:E,applyDisplayMethodChallengeReward:b,applyDrillReward:B,applyPremiumBonus:L}}}return{init:m}}function yc(e,t=1){const n=Number(e);if(Number.isFinite(n))return n>=1&&n<=5?1:n>=6&&n<=12?2:3;const r=Number(t);return r<=1?1:r>=3?3:2}function Cs(e=null){if(!e||typeof e!="object")return null;const t=Math.max(0,Number(e.encountersTotal??e.encounters_total??0)||0),n=Math.max(0,Number(e.last10Count??e.last10_count??0)||0),r=Math.max(0,Number(e.last10Greens??e.last10_greens??0)||0),a=Math.max(0,Number(e.last10Reds??e.last10_reds??0)||0),s=Math.max(0,Number(e.pivotsTaken??e.pivots_taken??0)||0),i=Math.max(0,Number(e.pivotsSuccess??e.pivots_success??0)||0),l=!!(e.anyRedT2Plus??e.any_red_t2plus),c={encountersTotal:t,last10Count:n,last10Greens:r,last10Reds:a,anyRedT2Plus:l,pivotsTaken:s,pivotsSuccess:i};return t>0||n>0||r>0||a>0||s>0||i>0||l?c:null}function hc(){if(typeof window>"u"||typeof document>"u")return null;const e=document.getElementById("premiumRootFrame"),t=e?.contentWindow||null,n=t?.__BC_STATE__?.get?.()||null,r=n?.ctx||t?.__BC_CTX__||null;return!n&&!r?null:{iframe:e,frameWin:t,state:n,ctx:r,progression:n?.runtime?.progression||t?.PROG||null}}function wc(e,t){const n=hc();if(!n?.state&&!n?.ctx)return n;const r=String(n?.ctx?.userId||"")===String(e||"")&&String(n?.ctx?.restaurantId||"")===String(t||"");return console.log("[BC] progression bc-ctx/bc-state check",{ctxMatches:r,ctxReady:!!n?.state?.ctxReady,progressionReady:!!n?.state?.progressionReady,stateHealth:n?.state?.stateHealth||null}),r||console.warn("[BC] progression bc-ctx/bc-state mismatch",{expectedUserId:e,expectedRestaurantId:t,liveUserId:n?.ctx?.userId||null,liveRestaurantId:n?.ctx?.restaurantId||null}),n}function bc(e={}){const t=e?.payload&&typeof e.payload=="object"?e.payload:{},n=t?.checks&&typeof t.checks=="object"?t.checks:{},r=t?.pivot&&typeof t.pivot=="object"?t.pivot:{},a=String(t?.performanceGrade??t?.performance_grade??e?.performance_grade??e?.latest_grade??"").trim().toUpperCase(),s=String(t?.chainSignal??t?.chain_signal??e?.chain_signal??e?.latest_chain_signal??"").trim().toLowerCase(),i=Number(t?.chainScore??t?.chain_score??e?.chain_score??e?.latest_chain_score??NaN),l=e?.is_green===!0||n?.modeStatus==="optimal"||n?.hookStatus==="optimal"||!!n?.deliveryCorrect||s==="green"||a==="A"||a==="B"||Number.isFinite(i)&&i>=3,c=e?.is_red===!0||s==="red"||a==="C"||a==="D"||a==="F"||!n?.readCorrect&&!n?.deliveryCorrect&&i<=0,o=Number(t?.encounterNumber??t?.encounter_number??e?.encounter_number??NaN),d=yc(Number.isFinite(Number(t?.tier))?Number(t.tier):null,Number.isFinite(o)?o:null),p=r?.taken===!0||t?.pivotTaken===!0||t?.pivot_taken===!0||e?.pivot_taken===!0||!!t?.recoveryChoice||!!t?.resetUsed,m=r?.success===!0||t?.pivotSuccess===!0||t?.pivot_success===!0||e?.pivot_success===!0||t?.recoveryCorrect===!0||t?.pivotCorrect===!0;return{tier:d,isGreen:l,isRed:c,pivotTaken:p,pivotSuccess:m,checks:n}}let I=null,nr=null;function vc(e){return e?typeof e=="string"?e:typeof e?.message=="string"&&e.message.trim()?e.message:String(e):"Unknown startup error."}function Sc(e){const t=document.querySelector("#app");t&&(t.innerHTML=`
    <section class="screen" style="width:min(880px, 100%);">
      <div class="panel stack">
        <div class="app-chrome-title">BottleCaller</div>
        <div class="small-text" style="text-transform:uppercase; letter-spacing:0.14em; opacity:0.72;">Startup Error</div>
        <p class="subtle" style="margin:0;">
          The app failed during boot. Check the message below and browser console.
        </p>
        <pre style="margin:0; white-space:pre-wrap; overflow:auto; border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:14px; background:rgba(0,0,0,0.28); color:rgba(255,240,240,0.96);">${y(vc(e))}</pre>
      </div>
    </section>
  `)}try{I=Nn()}catch(e){nr=e,console.error("[BC][BOOT] failed to initialize Supabase",e)}I&&!I.__BC_ID__&&(I.__BC_ID__="sb_"+Math.random().toString(16).slice(2));if(I&&!I.__BC_FINGERPRINT_PATCHED__){const e=I.auth.getSession.bind(I.auth);I.auth.getSession=async(...n)=>{const r=await e(...n);return Jr&&console.log("[SB]",I.__BC_ID__,"getSession ->",!!r?.data?.session),r};const t=I.auth.signOut.bind(I.auth);I.auth.signOut=async(...n)=>{Jr&&console.log("[SB]",I.__BC_ID__,"signOut CALLED",n);const r=await t(...n);return Jr&&console.log("[SB]",I.__BC_ID__,"signOut DONE",r?.error||"ok"),r},I.__BC_FINGERPRINT_PATCHED__=!0}window.escapeHtml=window.escapeHtml||function(t=""){return String(t).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")};var y=window.escapeHtml;const Jr=new URLSearchParams(window.location.search).get("bcDebug")==="1"||(()=>{try{return localStorage.getItem("BC_DEBUG_LOGS")==="1"}catch{return!1}})();let Xr=null;function Ec(){return Xr||(Xr=xa(()=>import("./progressionRouter-D5C7Tqz2.js"),__vite__mapDeps([0,1,2,3,4]))),Xr}async function ua(e){return(await Ec()).decideAllowedTier(e)}let Jn=null,ma=null;function ci(){return Jn||(Jn=xa(()=>import("./encounter-BE-hJ6tT.js"),[]).then(e=>(ma=t=>e.getEncounterById(String(t||"")),e)).catch(e=>{throw Jn=null,console.warn("[BC] encounter catalog preload failed",e),e})),Jn}function Rc(e){return typeof ma=="function"?ma(e):(ci(),null)}let Zr=null;function di(){return Zr||(Zr=xa(async()=>{const{createTutorialRuntime:e}=await import("./tutorialRuntime-C-2cq9Fp.js");return{createTutorialRuntime:e}},[]).then(({createTutorialRuntime:e})=>e({showScreen:K,openPremiumSetupScreen:Xi,routeManagerBoard:qr,normalizeManagerBoardTab:mt,getParentCtxSnapshot:ue,escapeHtml:y}))),Zr}function Ic(e){return di().then(t=>t.startTutorial(e))}function Cc(){return di().then(e=>e.openTutorialMenu())}function O(e,t){try{return typeof t=="function"?t():void 0}catch(n){console.error(`[BC][SAFE_CALL] ${e} failed`,n);return}}if(window.__BOTTLECALLER_BOOTED__)throw new Error("BottleCaller boot attempted twice.");window.__BOTTLECALLER_BOOTED__=!0;function Tc(){const e=window.matchMedia("(max-width: 860px)").matches,n=window.matchMedia("(pointer: coarse)").matches&&window.matchMedia("(max-width: 1100px)").matches;return e||n}function La(){const e=Tc();document.documentElement.dataset.bcMobileEnv=e?"true":"false",document.documentElement.dataset.bcViewport=e?"mobile":"desktop",window.__BC_ENV__={...window.__BC_ENV__||{},mobile:e},ui()}function ui(){const e=document.documentElement.dataset.bcMobileEnv==="true",t=document.getElementById("mbMessengerColumns"),n=document.getElementById("mbMessengerThreadsPane"),r=document.getElementById("mbMessengerDetailPane"),a=document.getElementById("mbThreadList"),s=document.getElementById("mbThreadMessages");!t||!n||!r||(e?(t.style.display="grid",t.style.gridTemplateColumns="minmax(0, 1fr)",t.style.gap="8px",t.style.width="100%",t.style.alignItems="stretch",t.style.overflow="visible",n.style.width="100%",n.style.minWidth="0",n.style.overflow="hidden",r.style.width="100%",r.style.minWidth="0",r.style.display="flex",r.style.flexDirection="column",r.style.minHeight="0",r.style.overflow="visible",a&&(a.style.maxHeight="260px",a.style.overflowY="auto"),s&&(s.style.minHeight="220px",s.style.maxHeight="42dvh",s.style.overflowY="auto")):(t.style.display="grid",t.style.gridTemplateColumns="280px 1fr",t.style.gap="12px",t.style.width="",t.style.alignItems="",t.style.overflow="",n.style.width="",n.style.minWidth="",n.style.overflow="",r.style.width="",r.style.minWidth="",r.style.display="",r.style.flexDirection="",r.style.minHeight="",r.style.overflow="",a&&(a.style.maxHeight="",a.style.overflowY=""),s&&(s.style.minHeight="",s.style.maxHeight="",s.style.overflowY="")))}La();window.addEventListener("resize",La,{passive:!0});window.addEventListener("orientationchange",La,{passive:!0});window.addEventListener("storage",e=>{if(e.key==="__BC_LOGOUT_LOCK__"&&e.newValue){console.warn("[CROSS-TAB] logout lock detected -> forcing logout UI");try{window.__BC_FORCE_LOGGED_OUT__=!0}catch{}try{window.location.replace("/?loggedOut=1&ts="+Date.now())}catch{}}});console.log("supabase client present:",!!I);window.__BC_SUPABASE__=I;function Ye(e){const t=document.getElementById("premiumRoot"),n=document.getElementById("premiumRootFrame");t&&(t.classList.toggle("hidden",!e),t.style.display=e?"":"none",t.style.pointerEvents=e?"auto":"none"),n&&(n.style.pointerEvents=e?"auto":"none")}function mi(e){return window.__BC_DRILL_CONFIG__=e,window.BC_DRILL_CONFIG=e,e}function Ht(e){return window.__BC_PENDING_START_DRILL__=null,window.BC_PENDING_START_DRILL=null,null}function ka({resetConfig:e=!1}={}){Ht(),e&&mi(null)}window.__BC_ACTIVE_TIMED_CHALLENGE__=window.__BC_ACTIVE_TIMED_CHALLENGE__||null;window.__BC_LAST_TIMED_CHALLENGE_RESULT__=window.__BC_LAST_TIMED_CHALLENGE_RESULT__||null;window.__BC_TUTORIAL__=window.__BC_TUTORIAL__||{active:!1,steps:[],stepIndex:0,role:null};window.setDefaultDrillConfig=window.setDefaultDrillConfig||function(t={}){const r={...{focus:"read",pool:["dictator","bargain_smart","griever"],durationSec:300},...t};return mi(r),console.log("[PARENT] __BC_DRILL_CONFIG__ set ✅",window.__BC_DRILL_CONFIG__),window.__BC_DRILL_CONFIG__};document.querySelector("#app").innerHTML=`
  <div class="app-chrome">
    <div class="app-chrome-brand">
      <div class="app-chrome-eyebrow">Service Training Cockpit</div>
      <div class="app-chrome-title-row">
        <div class="app-chrome-title">BottleCaller</div>
        <span class="app-chrome-badge" id="appChromeStatus">Public Access</span>
      </div>
      <div class="app-chrome-copy">A premium shell for live service training, guided reps, and manager-side coaching.</div>
    </div>
    <div class="app-chrome-context">
      <div class="app-chrome-chip">
        <span class="app-chrome-chip-label">Surface</span>
        <strong id="appChromeSurface">Lobby</strong>
      </div>
      <div class="app-chrome-chip">
        <span class="app-chrome-chip-label">Role</span>
        <strong id="appChromeRole">Guest</strong>
      </div>
      <div class="app-chrome-chip">
        <span class="app-chrome-chip-label">Restaurant</span>
        <strong id="appChromeRestaurant">Not bound</strong>
      </div>
    </div>
  </div>

  <!-- FACE WINDOW -->
  <section id="screenHome" class="screen">
    <div class="panel stack">
      <div class="topbar">
        <div class="brand">
          <h2>BottleCaller</h2>
          <span id="homeAuthBadge" class="badge hidden">LOGGED IN</span>
        </div>
        <div class="row">
          <button id="btnHomePremium" class="btn-ghost" type="button">Premium</button>
          <button id="btnHomeExitPremium" class="btn-ghost hidden" type="button">Exit Premium</button>
          <button id="btnHomeLogout" class="btn-danger hidden" type="button">Logout</button>
        </div>
      </div>

      <h1 class="title">Join Game</h1>
      <p class="subtle">
        Waiters play Demo immediately and can join by code. Managers enter Premium to configure the restaurant.
      </p>

      <div id="authFields" class="stack" style="margin-top:6px;">
        <input id="authEmail" type="email" placeholder="Email" />
        <input id="authPassword" type="password" placeholder="Password" />

        <!-- ✅ Premium intent extras -->
        <div id="premiumIntentBlock" class="hidden" style="margin-top:10px;color:#fff;">
          <div class="small auth-subselector-label">Premium Access</div>
          <input id="premiumLicenseCode" type="text" placeholder="Enter your join or license code" />
          <div class="small premium-contact-copy" style="margin-top:8px;">
            Contact us for purchase:
            <a href="mailto:hello@bottlecaller.com" style="color:#fff;">hello@bottlecaller.com</a>
          </div>
        </div>

        <!-- Auth mode first; signup reveals the role selector underneath -->
        <div class="tabs" id="modeTabs" data-selected="login" style="--selector-x: 0px;">
          <button id="tabModeLogin" class="tab active" type="button">Login</button>
          <button id="tabModeSignup" class="tab" type="button">Sign up</button>
        </div>

        <div id="roleTabsWrap" class="hidden">
          <div class="small auth-subselector-label">Choose role</div>
          <div class="tabs" id="roleTabs" data-selected="waiter" style="margin-top:10px; --selector-x: 0px;">
            <button id="tabRoleWaiter" class="tab active" type="button">Waiter</button>
            <button id="tabRoleManager" class="tab" type="button">Manager</button>
          </div>
        </div>

        <div id="displayNameWrap" class="hidden">
          <input id="authDisplayName" type="text" placeholder="Display name (optional)" />
        </div>

        <div id="signupContactBlock" class="hidden">
          <div class="small auth-subselector-label">Contact Us</div>
          <div class="small premium-contact-copy">
            Email <a href="mailto:hello@bottlecaller.com">hello@bottlecaller.com</a> with the setup you want and we will send the matching join or license code.
          </div>
        </div>

        <div id="managerSignupConfig" class="hidden">
          <div class="small auth-subselector-label">Premium Manager Setup</div>
          <div class="premium-signup-card">
            <div class="premium-signup-copy">
              Choose the manager package and seat plan you want provisioned. Keep this setup selected when you enter the code we issue for your account.
            </div>

            <div class="small auth-subselector-label">Manager Tier</div>
            <div class="tabs tabs-3" id="managerPackageTabs" data-selected="single_manager">
              <button id="tabManagerSingle" class="tab active" type="button">Single</button>
              <button id="tabManagerGroup" class="tab" type="button">Group</button>
              <button id="tabManagerEnterprise" class="tab" type="button">Enterpriser</button>
            </div>

            <div class="small auth-subselector-label">Seat Plan</div>
            <div class="tabs tabs-3" id="seatPlanTabs" data-selected="15">
              <button id="tabSeat15" class="tab active" type="button">15 Seats</button>
              <button id="tabSeat30" class="tab" type="button">30 Seats</button>
              <button id="tabSeat60" class="tab" type="button">60 Seats</button>
            </div>

            <div id="restaurantCountWrap" class="hidden">
              <div class="small auth-subselector-label">Number of Restaurants</div>
              <div class="tabs tabs-4" id="restaurantCountTabs" data-selected="3">
                <button id="tabRestaurant3" class="tab active" type="button">3</button>
                <button id="tabRestaurant5" class="tab" type="button">5</button>
                <button id="tabRestaurant7" class="tab" type="button">7</button>
                <button id="tabRestaurant10" class="tab" type="button">10</button>
              </div>
            </div>

            <div id="premiumRestaurantNameWrap" class="hidden">
              <input id="premiumRestaurantName" type="text" placeholder="Restaurant name for single-manager setup" />
            </div>

            <div class="small premium-contact-copy">
              Contact us at <a href="mailto:hello@bottlecaller.com">hello@bottlecaller.com</a> with your desired package, seat plan, and restaurant count if applicable. We will email back the correct code for this setup.
            </div>
          </div>
        </div>

        <div class="row">
          <button id="btnAuthSubmit" class="btn-primary" type="button">Continue</button>
        </div>

        <div id="authMsg" class="small"></div>
      </div>
    </div>
  </section>

  <!-- PREMIUM: Create Restaurant (Manager) -->
  <section id="screenCreateRestaurant" class="screen hidden">
    <div class="panel stack">
      <div class="topbar">
        <div class="brand">
          <h2>Create Restaurant</h2>
          <span class="badge">PREMIUM</span>
        </div>
        <button id="btnLogoutCreate" class="btn-danger" type="button">Logout</button>
      </div>

      <p class="small">Seat provisioning now starts from Premium signup and your issued license code.</p>

      <input id="restName" type="text" placeholder="Restaurant name" />
      <button id="btnCreateRestaurant" class="btn-primary" type="button">Create</button>

      <div id="createRestMsg" class="small"></div>

      <div id="invitePanel" class="hidden">
        <hr class="hr"/>
        <h3>Created</h3>
        <p class="small">Join code is inside the Premium menu.</p>
        <p class="small"><b>Join code:</b> <span id="inviteCodeText" class="mono"></span></p>
        <div class="row">
          <button id="btnCopyCode" type="button">Copy code</button>
          <button id="btnEnterPremium" class="btn-primary" type="button">Enter Premium</button>
        </div>
        <div id="inviteMsg" class="small"></div>
      </div>
    </div>
  </section>

  <!-- PREMIUM APP -->
  <section id="screenPremiumApp" class="screen hidden">
    <div class="panel stack">
      <div class="topbar">
        <div class="brand">
          <h2>BottleCaller</h2>
          <span id="premiumBadge" class="badge">PREMIUM</span>
        </div>
        <div class="row">
          <button id="btnOpenHud" class="btn-ghost" type="button">Menu</button>
          <button id="btnOpenMessages" class="btn-ghost" type="button">Messages</button>
          <button id="btnWaiterPerformanceLeaderboard" class="btn-ghost hidden" type="button">Leaderboard</button>
          <button id="btnPremiumWineSetup" class="btn-ghost" type="button" data-tutorial="nav-wine-setup">Wine Setup</button>
          <button id="btnTutorial" class="btn-ghost" type="button">Tutorials</button>
          <button id="btnManagerBoard" class="btn-ghost" type="button">Manager Board</button>
          <button id="btnOpenProfile" class="btn-ghost" type="button">Profile</button>
          <button id="btnLogoutPremium" class="btn-danger" type="button">Logout</button>
        </div>
      </div>

      <div id="bcUnlockNotice" class="bc-unlock" style="display:none;"></div>

      <!-- Game lives here (isolated) -->
      <div id="premiumRoot"></div>
    </div>
  </section>

  <section id="screenProfile" class="screen hidden">
    <div class="panel stack">
      <div class="topbar">
        <div class="brand">
          <h2>Profile</h2>
          <span class="badge">PREMIUM</span>
        </div>
        <div class="row">
          <button id="btnBackFromProfile" class="btn-ghost" type="button">Back</button>
        </div>
      </div>

      <div class="card">
        <div class="score-row">Display name: <span id="profileDisplayName">-</span></div>
        <div class="score-row">Role: <span id="profileRole">-</span></div>
        <div class="score-row">Restaurant: <span id="profileRestaurant">-</span></div>
        <div class="score-row">Scope type: <span id="profileScopeType">-</span></div>
        <div class="score-row">Scope id: <span id="profileScopeId">-</span></div>
        <div class="score-row">Access tier: <span id="profileAccessTier">-</span></div>
      </div>

      <div id="profileStandingCard" style="margin-top:12px;"></div>
      <div id="profileBadgeShelf" style="margin-top:12px;"></div>
      <div id="profileInsightCard" style="margin-top:12px;"></div>
      <div id="profileTutorialCard" class="hidden" style="margin-top:12px;">
        <div class="card">
          <div style="font-weight:600; margin-bottom:8px;">Tutorials</div>
          <div id="profileTutorialCopy" class="small" style="opacity:.8; margin-bottom:10px;">
            Launch the guided encounter walkthrough directly from your profile.
          </div>
          <button id="btnProfileEncounterTutorial" class="btn" type="button">Start Encounter Tutorial</button>
        </div>
      </div>
      <div id="profileMultiRestaurantCard" style="margin-top:12px;"></div>
    </div>
  </section>

  <section id="screenWaiterLeaderboard" class="screen hidden">
    <div class="panel stack">
      <div class="topbar">
        <div class="brand">
          <h2>Performance Leaderboard</h2>
          <span class="badge">PREMIUM</span>
        </div>
        <div class="row">
          <button id="btnCloseWaiterLeaderboard" class="btn-ghost" type="button">Close</button>
        </div>
      </div>

      <div class="card">
        <div class="mb-section-header">
          <strong>Performance Leaderboard</strong>
          <div class="small-text" id="waiterLeaderboardRestaurantLabel">Live performance snapshot for this restaurant.</div>
        </div>
        <div id="waiterLeaderboardManagerContext" class="small-text" style="margin-top:8px;"></div>
        <div id="waiterLeaderboardMsg" class="small-text" style="margin-top:10px;"></div>
        <div class="mb-performance-table-wrap" style="margin-top:12px;">
          <table class="mb-performance-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team Member</th>
                <th>Total Points</th>
                <th>Drill Pass %</th>
                <th>Encounter Pass %</th>
                <th>Challenge Success %</th>
                <th>Premium Success %</th>
                <th>Mastery %</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody id="waiterLeaderboardRows"></tbody>
          </table>
        </div>
      </div>
    </div>
  </section>

  <!-- PREMIUM SETUP (PARENT-OWNED) -->
  <section id="screenSetupPremium" class="screen hidden">
    <div class="panel app-setup-shell">
      <div class="app-setup-header">
        <h2>Setup</h2>
        <div class="score-row app-score-row">Wines added: <span id="wineCountPremium">0 / 10</span></div>
      </div>

      <div class="manager-panel app-setup-list">
        <h3>Wine List</h3>
        <div id="premiumWineCards" class="wine-cards" data-tutorial="wine-list"></div>

        <details id="premiumWineAdvanced" class="wine-advanced panel-spaced app-advanced-panel">
          <summary>Advanced (add wines + table)</summary>

          <div id="wineAdminPanel" class="panel-spaced app-admin-panel" data-tutorial="wine-panel">
            <div class="manager-row app-form-row">
              <input type="text" id="wineNameInputPremium" data-tutorial="wine-name" placeholder="Wine Name (required)" />
              <input type="text" id="wineVarietalInputPremium" data-tutorial="wine-varietal" placeholder="Varietal (required)" />
            </div>

            <div class="manager-row app-form-row app-form-section">
              <strong>Fruit Profile (choose up to 2):</strong>
              <div class="option-grid" id="fruitOptionsPremium" data-tutorial="fruit-options"></div>
            </div>

            <div class="manager-row app-form-row app-form-section">
              <strong>Structure/Texture (choose up to 2):</strong>
              <div class="option-grid" id="textureOptionsPremium" data-tutorial="texture-options"></div>
            </div>

            <div class="manager-row app-form-row app-form-section">
              <strong>Oak Level (choose 1):</strong>
              <div class="option-grid" id="oakOptionsPremium" data-tutorial="oak-options"></div>
            </div>

            <div class="manager-row app-form-row app-form-section">
              <input type="text" id="regionInputPremium" data-tutorial="wine-region" placeholder="Region (optional)" />
            </div>

            <div class="manager-row app-form-row">
              <button id="addWineBtnPremium" type="button" data-tutorial="wine-add">Add Wine</button>
            </div>

            <table class="wine-table">
              <thead>
                <tr>
                  <th>Name</th><th>Varietal</th><th>Fruit</th><th>Texture</th><th>Oak</th><th>Process</th><th>Region</th><th>Story</th><th>Action</th>
                </tr>
              </thead>
              <tbody id="premiumWineTableBody"></tbody>
            </table>
          </div>
        </details>
      </div>

      <div class="button-row app-setup-actions">
        <button id="btnContinuePremium" type="button" data-tutorial="encounter-start">Start</button>
        <button id="btnBackHomeFromSetupPremium" type="button" data-tutorial="encounter-back">Back</button>
      </div>
    </div>
  </section>

  <!-- MANAGER BOARD -->
  <section id="screenManagerBoard" class="screen hidden">
    <div class="panel stack">
      <div class="topbar">
        <div class="brand">
          <h2>Manager Board</h2>
          <span class="badge">PREMIUM</span>
        </div>
        <div class="row">
          <button id="btnBackToPremium" class="btn-ghost" type="button">Back</button>
          <button id="btnLogoutManagerBoard" class="btn-danger" type="button">Logout</button>
        </div>
      </div>

      <div id="mbMenu" class="card" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <button class="btn" type="button" data-mbtab="overview" data-tutorial="mb-tab-overview">Overview</button>
        <button class="btn" type="button" data-mbtab="people" data-tutorial="mb-tab-people">People</button>
        <button class="btn" type="button" data-mbtab="messenger" data-tutorial="mb-tab-messenger">Messenger</button>
        <button class="btn" type="button" data-mbtab="live_controls" data-tutorial="mb-tab-live-controls">Live Controls</button>
        <button class="btn" type="button" data-mbtab="performance" data-tutorial="mb-tab-performance">Performance</button>
        <button class="btn" type="button" data-mbtab="selection" data-tutorial="mb-tab-selection">Selection</button>
        <button class="btn" type="button" data-mbtab="billing" data-tutorial="mb-tab-billing">Listing</button>
        <button class="btn hidden" type="button" data-mbtab="enterprise" id="mbEnterpriseTabBtn" data-tutorial="mb-tab-enterprise">Enterprise</button>
        <select id="mbRestaurantPicker" class="hidden input" data-tutorial="restaurant-picker" style="margin-left:auto; min-width:220px;"></select>
      </div>

      <div id="mbPanels">
        <div id="mbTab_overview" class="mbTab" data-tutorial="mb-panel-overview">
          <div id="mbParentStateCard" style="margin-bottom:12px;"></div>
          <div id="mbOverviewRitualStatus" style="margin-top:12px;"></div>
          <div class="card">
            <div class="score-row">Restaurant: <span id="mbRestName">-</span></div>
            <div class="score-row">Total runs: <span id="mbRunsTotal">-</span></div>
            <div class="score-row">Total drills: <span id="mbDrillsTotal">-</span></div>
          </div>

          <div id="mbRestaurantContextCard" style="margin-top:12px;"></div>
          <div id="mbGroupOverviewCard" style="margin-top:12px;"></div>
          <div id="mbGroupMetricsCard" style="margin-top:12px;"></div>
          <div id="mbGroupRestaurantComparisonCard" style="margin-top:12px;"></div>
          <div id="mbOverviewTimedChallenge" style="margin-top:12px;"></div>
          <div id="mbOverviewDisplayMethodChallenge" style="margin-top:12px;"></div>
          <div id="mbOverviewRecentChallenges" style="margin-top:12px;"></div>
          <div id="mbInviteSummary" style="margin-top:12px;"></div>
          <div id="mbDrillSummary" style="margin-top:12px;"></div>
        </div>

        <div id="mbTab_people" class="mbTab hidden" data-tutorial="mb-panel-people">
          <div id="mbPeopleSummary" style="margin-top:12px;"></div>
          <div id="mbInvitesPanel" style="margin-top:12px;">
            <div class="card" style="padding:12px;">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                <strong>Invites</strong>
              </div>
              <div id="invitesList" style="margin-top:10px;"></div>
            </div>
          </div>
          <div id="mbStaffPanel" style="margin-top:12px;">
            <div class="card" id="mbMembersCard" style="margin-top:12px;">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                <strong>Members</strong>
                <button id="mbRefreshMembers" class="btn" type="button">Refresh</button>
              </div>
              <div style="display:flex; gap:8px; margin-top:10px; align-items:center;">
                <input
                  id="mbPeopleSearch"
                  class="input"
                  type="search"
                  placeholder="Search people by name, role, or user id"
                  style="width:100%;"
                />
                <button id="mbPeopleSearchClear" class="btn-ghost" type="button" title="Clear people search">Clear</button>
              </div>
              <div id="mbMembersMsg" class="small-text" style="margin-top:6px;"></div>
              <div id="mbMembersList" style="margin-top:10px; display:flex; flex-direction:column; gap:8px;"></div>
            </div>
          </div>
        </div>
        <div id="mbTab_messenger" class="mbTab hidden" data-tutorial="mb-panel-messenger">
          <div class="card" style="margin-top:12px;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
              <strong>Messenger</strong>
              <div style="display:flex; gap:8px; align-items:center;">
                <button id="mbToggleMessengerPanel" class="btn-ghost" type="button">Close Inbox</button>
                <button id="mbMsgRefresh" class="btn-ghost" type="button">Refresh</button>
              </div>
            </div>

            <div class="small-text" style="margin-top:6px; opacity:.85;">
              Progress reports from staff + coaching replies. (Per active restaurant.)
            </div>

            <div id="mbMessengerDeck" style="display:flex; flex-direction:column; gap:0; margin-top:12px;">
            <div id="mbTimedChallengeComposer" class="card" style="display:flex; flex-direction:column; gap:10px; padding:12px; margin-top:12px; margin-bottom:12px;">
              <div style="font-weight:600;">Send Timed Challenge</div>

              <div class="row" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                <select id="mbTimedChallengeTarget" style="min-width:180px;"></select>

                <select id="mbTimedChallengeType">
                  <optgroup label="Skill Focus">
                    <option value="closing_push">Closing Push</option>
                    <option value="recovery_window">Recovery Window</option>
                    <option value="read_first">Read First</option>
                    <option value="full_delivery">Full Delivery</option>
                  </optgroup>
                  <optgroup label="Outcome">
                    <option value="clean_close">Clean Close</option>
                    <option value="soft_close">Soft Close</option>
                    <option value="successful_pivot">Successful Pivot</option>
                  </optgroup>
                  <optgroup label="Discipline">
                    <option value="no_reset_run">No Reset Run</option>
                    <option value="stable_signal">Stable Signal</option>
                    <option value="controlled_table">Controlled Table</option>
                  </optgroup>
                  <optgroup label="Momentum">
                    <option value="solid_interaction">Solid Interaction</option>
                    <option value="premium_moment">Premium Moment</option>
                    <option value="commanding_presence">Commanding Presence</option>
                  </optgroup>
                </select>

                <select id="mbTimedChallengeWine" style="min-width:220px;"></select>

                <select id="mbTimedChallengeDuration">
                  <option value="3600">1 hr</option>
                  <option value="7200">2 hrs</option>
                  <option value="10800" selected>3 hrs</option>
                </select>

                <select id="mbTimedChallengePlacement">
                  <option value="before_start" selected>Before encounter 1</option>
                  <option value="after_first_encounter">After encounter 1</option>
                </select>

                <input
                  id="mbTimedChallengeReward"
                  type="number"
                  min="1"
                  max="5"
                  step="1"
                  value="5"
                  style="width:110px;"
                  placeholder="Points"
                />
              </div>

              <div class="small" style="opacity:.8;">
                Assign a live objective by skill focus, outcome, discipline, or momentum.
              </div>

              <div class="row" style="display:flex; gap:8px; align-items:center;">
                <button id="btnSendTimedChallenge" class="btn" type="button">Send Challenge</button>
                <div id="mbTimedChallengeStatus" class="small" style="opacity:.85;"></div>
              </div>

              <div id="mbTimedChallengeRecentSummary" class="small" style="opacity:.85; margin-top:4px;"></div>
            </div>

            <div id="mbMessengerColumns" style="display:grid; grid-template-columns: 280px 1fr; gap:12px; margin-top:12px;">
              <div id="mbMessengerThreadsPane" style="border:1px solid rgba(255,255,255,0.10); border-radius:12px; overflow:hidden;">
              <div style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.10); font-weight:600;">
                  Staff Threads
                </div>

                <div style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.10);">
                  <div style="display:flex; gap:8px; align-items:center;">
                    <input
                      id="mbMessengerSearch"
                      class="input"
                      type="search"
                      placeholder="Search threads by person, message, or type"
                      style="width:100%;"
                    />
                    <button id="mbMessengerSearchClear" class="btn-ghost" type="button" title="Clear thread search">Clear</button>
                  </div>
                </div>

                <div id="mbThreadList" style="display:flex; flex-direction:column; gap:0;"></div>

                <div id="mbThreadEmpty" class="small-text" style="padding:10px; display:none; opacity:.8;">
                  No waiter threads yet.
                </div>
              </div>

              <div id="mbMessengerDetailPane" style="border:1px solid rgba(255,255,255,0.10); border-radius:12px; overflow:hidden; display:flex; flex-direction:column; min-height:520px;">
              <div style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.10);">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                  <strong id="mbThreadTitle">Select a waiter</strong>
                  <span id="mbThreadMeta" class="small-text" style="opacity:.75;"></span>
                </div>
              </div>

              <div id="mbThreadTimelinePanel" class="card" style="margin:10px 10px 0; padding:10px;"></div>

                <div id="mbThreadMessages"
                  style="flex:1; padding:10px; display:flex; flex-direction:column; gap:8px; overflow-y:auto; min-height:280px; border-top:1px solid rgba(255,255,255,0.10);">
                  <div class="small-text" style="opacity:.8;">Select a waiter thread in this restaurant to assign a timed challenge.</div>
                </div>

                <div id="mbThreadActions" style="padding:10px; border-top:1px solid rgba(255,255,255,0.10); display:flex; flex-direction:column; gap:10px;">
                  <div id="mbThreadStatePanel" class="card" style="padding:10px;"></div>

                  <div id="mbThreadRecommendationsPanel" class="card" style="padding:10px;">
                    <div>
                      <strong>Suggested prompts</strong>
                      <div id="mbSuggestedPrompts" style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;"></div>
                    </div>

                    <div id="mbThreadChallengeRecommendations" style="margin-top:12px;"></div>
                  </div>

                  <div class="small-text" style="opacity:.75;">Actions</div>
                  <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                    <button id="mbInstrRunDrill" class="btn-ghost" type="button">Run Drill</button>
                    <button id="mbInstrUseSuggestion" class="btn-ghost" type="button">Use Suggestion</button>
                  </div>

                  <textarea id="mbInstrBody" class="input"
                    style="width:100%; min-height:110px;"
                    placeholder="Example: Tonight: keep it short + confirm intent first. Run 5-min Guest Reading before shift."></textarea>

                  <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                    <button id="mbInstrSend" class="btn" type="button">Send Message</button>
                  </div>

                  <div class="small-text" id="mbInstrQuota" style="opacity:.78;"></div>
                  <div class="small-text" id="mbInstrStatus" style="opacity:.85;"></div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>

        <div id="mbTab_live_controls" class="mbTab hidden" data-tutorial="mb-panel-live-controls">
          <div id="mbOverviewLiveEffects" style="margin-top:12px;"></div>
          <div id="mbOverviewAbilityEconomy" style="margin-top:12px;"></div>
          <div id="mbAttributeAbilitiesPanel" style="margin-top:12px;"></div>
          <div id="mbAreaAbilitiesPanel" style="margin-top:12px;"></div>
          <div id="mbDrillQuickActionsPanel" style="margin-top:12px;"></div>
          <div id="mbTimedChallengeQuickActionsPanel" style="margin-top:12px;"></div>
          <div id="mbDisplayMethodQuickActionsPanel" style="margin-top:12px;"></div>
        </div>

        <div id="mbTab_performance" class="mbTab hidden" data-tutorial="mb-panel-performance">
        <div id="mbInsightsPanel" style="margin-top:12px;"></div>
        <div id="mbPerformanceHistoryPanel" style="margin-top:12px;">
          <details class="card mb-disclosure">
            <summary class="mb-disclosure-summary">
              <div>
                <strong>Performance History</strong>
                <div class="small-text" style="margin-top:6px; opacity:.85;">
                  Skill growth and encounter reactions for the selected waiter.
                </div>
              </div>
              <label class="small-text" style="display:flex; align-items:center; gap:8px;">
                Waiter
                <select id="mbHistoryUser" class="input" style="min-width:220px;"></select>
              </label>
            </summary>
            <div class="mb-disclosure-body">
              <div id="mbHistorySummaryStrip" style="margin-top:10px;"></div>
              <canvas id="mbHistoryChart"
                width="600"
                height="280"
                style="margin-top:12px;">
              </canvas>
              <div id="mbPerformanceLegend" style="margin-top:8px;"></div>
              <div id="managerEncounterSummaryHost" class="manager-encounter-summary-host" style="margin-top:12px;"></div>
            </div>
          </details>
        </div>

          <div id="mbBestStreaksPanel" class="card" style="margin-top:12px;">
            <div style="font-weight:600; margin-bottom:6px;">Best streaks</div>
            <div id="mbBestStreaks" style="opacity:.9;">-</div>
          </div>

          <div id="mbNeedsCoachingPanel" class="card" style="margin-top:12px;">
            <div style="font-weight:600; margin-bottom:6px;">Needs coaching</div>
            <div id="mbNeedsCoaching" style="opacity:.9;">-</div>
          </div>

          <details id="mbRecentPanel" class="card mb-disclosure">
            <summary class="mb-disclosure-summary">
              <div>
                <strong>Recent Activity</strong>
                <div class="small-text" style="margin-top:6px; opacity:.85;">
                  Latest reporting and training events.
                </div>
              </div>
            </summary>
            <div class="mb-disclosure-body">
              <div id="mbRecent" class="small" style="opacity:.9;">Loading…</div>
            </div>
          </details>

          <div id="mbWeeklyReportPanel" class="card" style="margin-top:12px;">
            <strong>Weekly Training Report</strong>

            <div class="small-text" style="margin-top:6px; opacity:.85;">
              Summary of team progress over the last 7 days.
            </div>

            <div id="mbWeeklyReport" style="margin-top:10px;">
              <div class="small-text" style="opacity:.7;">Loading report…</div>
            </div>
          </div>
        </div>

        <div id="mbTab_selection" class="mbTab hidden" data-tutorial="mb-panel-selection">
          <div id="mbSelectionPanel" style="margin-top:12px;"></div>
        </div>

        <div id="mbTab_billing" class="mbTab hidden" data-tutorial="mb-panel-billing">
          <div id="mbBillingAccess" class="card" style="margin-top:12px;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
              <strong>Billing & Access</strong>
              <span id="mbSeatStatus" class="badge">Seats: —</span>
            </div>

            <div class="small-text" id="mbSeatDetail" style="margin-top:6px;">
              Loading seat usage…
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
              <button id="mbRefreshSeats" class="btn-ghost" type="button">Refresh</button>
            </div>
            <div class="small-text premium-contact-copy" style="margin-top:10px;">
              Seat plans are now provisioned through Premium signup and licensing. Contact <a href="mailto:hello@bottlecaller.com">hello@bottlecaller.com</a> if you need a different seat package issued.
            </div>
          </div>
        </div>

        <div id="mbTab_enterprise" class="mbTab hidden" data-tutorial="mb-panel-enterprise">
          <div id="mbEnterprisePanel" style="margin-top:12px;">
            <div class="card" style="padding:12px;">
              <div style="font-weight:600;">Enterprise</div>
              <div class="small-text" style="margin-top:8px; opacity:.8;">
                Enterprise-level controls will appear here for enterpriser roles.
              </div>
            </div>
          </div>
        </div>

      </div>

      <div id="mbMsg" class="small"></div>
    </div>
  </section>

  <!-- DEMO APP -->
  <section id="screenGameDemo" class="screen hidden">
    <div class="panel stack">
      <div class="topbar">
        <div class="brand">
          <h2>BottleCaller</h2>
          <span class="badge">DEMO</span>
          <span id="demoAuthedBadge" class="badge hidden">LOGGED IN</span>
        </div>
        <div class="row">
          <button id="btnDemoPremium" class="btn-ghost" type="button">Premium</button>
          <button id="btnDemoExit" type="button">Exit</button>
        </div>
      </div>

      <!-- Join block: only for logged-in waiter with no restaurant -->
      <div id="demoJoinBlock" class="hidden card">
        <div class="row" style="justify-content:space-between; align-items:flex-start;">
          <div style="min-width:220px;">
            <b>Join a restaurant</b>
            <p class="small" style="margin-top:6px;">
              Paste the join code. You can keep playing Demo while Premium access is restricted.
            </p>
          </div>

          <div style="min-width:260px;">
            <input id="demoJoinCode" type="text" placeholder="Join code" />
            <div class="row" style="margin-top:10px;">
              <button id="btnDemoJoin" class="btn-primary" type="button">Submit</button>
            </div>
          </div>
        </div>

        <div id="demoJoinMsg" class="small" style="margin-top:10px;"></div>
      </div>

      <!-- Game lives here (isolated) -->
      <div id="gameRootDemo" style="margin-top:10px;"></div>
      <div class="small" style="margin-top:8px;">
        Contact us for purchase:
        <a href="mailto:hello@bottlecaller.com" style="color:#fff;">hello@bottlecaller.com</a>
      </div>
    </div>
  </section>

  <!-- HUD BACKDROP -->
  <div id="hudBackdrop" class="hidden"
    style="position:fixed; inset:0; background: rgba(0,0,0,0.55); z-index: 99998;"></div>

  <div id="waiterMessagesBackdrop" class="hidden"
    style="position:fixed; inset:0; background: rgba(0,0,0,0.55); z-index: 2147482999;"></div>

  <div id="waiterMessagesPanel" class="hidden"
    style="
      position:fixed; right:12px; top:12px;
      width:min(560px, 94vw);
      max-height:calc(100vh - 24px);
      overflow-y:auto;
      z-index:2147483001;
      background:#0b0d0f; color:#fff;
      border-radius:14px;
      padding:12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      border:1px solid rgba(255,255,255,0.10);
    ">
    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
      <b>Coach Messages</b>
      <button id="btnCloseMessages" type="button" style="font-size:12px;">Close</button>
    </div>

    <div id="waiterMessagesThread" style="margin-top:12px; display:flex; flex-direction:column; gap:8px;">
      <div class="small-text" style="opacity:.8;">No messages yet.</div>
    </div>

    <div style="margin-top:14px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.10);">
      <button id="btnWaiterSendProgress" class="btn-ghost" type="button">Send Progress</button>
      <div id="waiterSendProgressStatus" class="small-text" style="margin-top:6px; opacity:.85;"></div>
    </div>
  </div>

  <!-- HUD PANEL -->
  <div id="hudPanel" class="hidden"
    style="
      position:fixed; right: 12px; top: 12px;
      width: min(520px, 92vw);
      max-height: calc(100vh - 24px);
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-gutter: stable;
      z-index: 2147483000;
      pointer-events: auto;
      background: #0b0d0f; color: #fff;
      border-radius: 14px;
      padding: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.10);
    ">
    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
      <b>Premium Menu</b>
      <button id="btnCloseHud" type="button" style="font-size:12px;">Close</button>
    </div>

    <div style="margin-top:10px; font-size:13px; opacity:.95;">
      <div><b>Role:</b> <span id="hudRole">-</span></div>
      <div><b>Restaurant:</b> <span id="hudRestName">-</span></div>

      <!-- Join code MANAGER ONLY -->
      <div id="hudJoinRow" class="hidden"><b>Join code:</b> <span id="hudJoinCode">-</span></div>

      <div><b>Seat limit:</b> <span id="hudSeatLimit">-</span></div>
      <div><b>Invite required:</b> <span id="hudRequireInvite">-</span></div>
    </div>
    <div id="hudSkillsCard" style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.10);">
      <div style="font-weight:600; margin-bottom:8px;">Your Skills</div>

      <div class="small-text" id="hudSkillSummary" style="margin-bottom:8px; opacity:.85;">
        Loading skill summary…
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px 12px; margin-bottom:10px;">
        <div class="small-text">Reading: <span id="hudSkillRead">0%</span></div>
        <div class="small-text">Framing: <span id="hudSkillFraming">0%</span></div>
        <div class="small-text">Delivery: <span id="hudSkillDelivery">0%</span></div>
        <div class="small-text">Recovery: <span id="hudSkillRecovery">0%</span></div>
        <div class="small-text">Closing: <span id="hudSkillClosing">0%</span></div>
      </div>

      <canvas id="hudSkillRadar" width="240" height="240" style="display:block; margin:0 auto;"></canvas>

      <div id="hudSkillTimeline" style="margin-top:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:6px;">
          <div id="hudTimelineTitle" style="font-weight:600;">Recent Progress</div>
          <select id="hudTimelineUserSelect" class="hidden" style="max-width:180px;"></select>
        </div>

        <div id="hudTimelineList" class="small-text" style="display:flex; flex-direction:column; gap:6px;">
          <div style="opacity:.7;">No history yet.</div>
        </div>

      </div>
    </div>
    <div id="hudAbilitiesCard" style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.10);">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:8px;">
        <div style="font-weight:600;">Abilities</div>
        <div class="small-text" id="hudAbilitiesStatus" style="opacity:.8;">No active effects</div>
      </div>

      <div id="hudAbilitySlots" style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
        <div id="hudAttributeSlotCard" style="padding:10px; border:1px solid rgba(255,255,255,0.08); border-radius:10px;">
          <div class="small-text" style="opacity:.7;">Attribute Slot</div>
          <div id="hudAttributeSlotStatus" style="font-weight:600; margin-top:4px;">-</div>
          <div id="hudAttributeSlotMeta" class="small-text" style="opacity:.8; margin-top:4px;">-</div>
        </div>
        <div id="hudAreaSlotCard" style="padding:10px; border:1px solid rgba(255,255,255,0.08); border-radius:10px;">
          <div class="small-text" style="opacity:.7;">Area Slot</div>
          <div id="hudAreaSlotStatus" style="font-weight:600; margin-top:4px;">-</div>
          <div id="hudAreaSlotMeta" class="small-text" style="opacity:.8; margin-top:4px;">-</div>
        </div>
      </div>

      <div style="display:flex; gap:8px; margin-bottom:10px;">
        <button id="btnHudAbilitiesAttribute" type="button" class="btn-ghost">Attribute</button>
        <button id="btnHudAbilitiesArea" type="button" class="btn-ghost">Area</button>
      </div>

      <div id="hudAbilitiesAttributeList" style="display:flex; flex-direction:column; gap:8px;"></div>
      <div id="hudAbilitiesAreaList" class="hidden" style="display:none; flex-direction:column; gap:8px;"></div>

      <div id="hudActiveEffects" style="margin-top:12px;">
        <div style="font-weight:600; margin-bottom:6px;">Active Effects</div>
        <div id="hudActiveEffectsList" class="small-text" style="display:flex; flex-direction:column; gap:6px;">
          <div style="opacity:.7;">No active abilities.</div>
        </div>
      </div>
    </div>
    <div id="hudTimedChallengeCard" style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.10);">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:8px;">
        <div style="font-weight:600;">Timed Challenge</div>
        <div id="hudTimedChallengeStatus" class="small-text" style="opacity:.8;">No active challenge</div>
      </div>
      <div id="hudTimedChallengeBody" class="small-text" style="display:flex; flex-direction:column; gap:6px;">
        <div style="opacity:.7;">No challenge assigned.</div>
      </div>
    </div>
    <div id="hudDisplayMethodChallengeCard" style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.10);">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:8px;">
        <div style="font-weight:600;">Display Method Challenge</div>
        <div id="hudDisplayMethodChallengeStatus" class="small-text" style="opacity:.8;">No active challenge</div>
      </div>
      <div id="hudDisplayMethodChallengeBody" class="small-text" style="display:flex; flex-direction:column; gap:6px;">
        <div style="opacity:.7;">No challenge assigned.</div>
      </div>
    </div>
    <div id="hudDifficultyCard" style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.10);">
      <div style="font-weight:600; margin-bottom:8px;">Difficulty</div>

      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button id="btnDifficultyEasy" class="btn-ghost" type="button">Easy</button>
        <button id="btnDifficultyMedium" class="btn-ghost" type="button">Medium</button>
        <button id="btnDifficultyHard" class="btn-ghost" type="button">Hard</button>
      </div>

      <div id="hudDifficultyStatus" class="small-text" style="margin-top:6px; opacity:.85;">
        Current: -
      </div>
    </div>
    <div style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.10);">
      <button id="btnHudSendProgress" class="btn-ghost" type="button">Send progress to manager</button>
      <div id="hudSendProgressStatus" class="small-text" style="margin-top:6px; opacity:.85;"></div>
    </div>

    <!-- Copy join code MANAGER ONLY -->
    <div id="hudCopyRow" class="row hidden" style="margin-top:10px;">
      <button id="btnCopyHudCode" type="button">Copy join code</button>
    </div>

    <div id="managerOnlyBlock" class="hidden">
      <hr style="opacity:.25; margin:12px 0;" />

      <h3 style="margin:0;">Manager controls</h3>

      <div style="margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <label style="font-size:12px; opacity:.9;">
          <input id="toggleRequireInvite" type="checkbox" />
          Require invite to join
        </label>
        <button id="btnSaveRequireInvite" class="btn-primary" type="button">Save</button>
      </div>

      <hr style="opacity:.25; margin:12px 0;" />
      <div id="managerSetupSection">
      <h3 style="margin:0;">Manager setup codes</h3>
      <div class="small-text" style="margin-top:6px; opacity:.9;">
        Redeem Group / Enterprise manager_setup codes.
      </div>
      <div id="mbGroupSetupCard" class="card" style="margin-top:10px;">
        <strong>Group Manager Signup</strong>
        <div class="small-text" style="margin-top:6px;">
          Paste a GROUP manager_setup code to create/upgrade a manager scope for multi-restaurant control.
        </div>

        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
          <input id="mbGroupSetupCode" type="text" placeholder="GROUP_XXXXX" style="flex:1; min-width:220px;" />
          <button id="mbRedeemGroupSetup" class="btn-primary" type="button">Redeem</button>
        </div>

        <div id="mbGroupSetupMsg" class="small-text" style="margin-top:8px;"></div>
        <div class="small-text premium-contact-copy" style="margin-top:10px;">
          Contact us at <a href="mailto:hello@bottlecaller.com">hello@bottlecaller.com</a> with the upgrade and seat plan you want. We will issue the matching code for this profile.
        </div>
      </div>

      <div id="mbProvisionAccess" class="card" style="margin-top:12px;">
        <strong>Enterprise Signup</strong>
        <div class="small-text" style="margin-top:6px;">
          Paste an Enterprise manager_setup code to upgrade this manager scope.
        </div>

        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
          <input id="mbEnterpriseCode" type="text" placeholder="ENTERPRISE_XXXXX" style="flex:1; min-width:220px;" />
          <button id="mbRedeemEnterprise" class="btn-primary" type="button">Redeem</button>
        </div>

        <div id="mbEnterpriseMsg" class="small-text" style="margin-top:8px;"></div>
        <div class="small-text premium-contact-copy" style="margin-top:10px;">
          Contact us at <a href="mailto:hello@bottlecaller.com">hello@bottlecaller.com</a> for enterprise provisioning. We will send the correct enterprise code for this account.
        </div>
      </div>
      </div>

      <hr style="opacity:.25; margin:12px 0;" />
      <div id="premiumActiveRestaurantCard" class="card" style="margin-top:12px;">
        <strong>Active Restaurant</strong>
        <div class="small-text" style="margin-top:6px;">
          Switch which restaurant you’re managing right now.
        </div>

        <div style="display:flex; gap:8px; margin-top:10px; align-items:center;">
          <select id="selActiveRestaurant" class="input" style="flex:1;"></select>
          <button id="btnSetActiveRestaurant" class="btn" type="button">Set</button>
        </div>

        <div id="activeRestaurantHint" class="small-text" style="margin-top:8px;"></div>
      </div>
      <div id="hudRestaurantPickerMsg" class="small-text" style="margin-top:8px;"></div>

      <hr style="opacity:.25; margin:12px 0;" />

      <h3 style="margin:0;">Invite emails</h3>
      <div style="margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <input id="inviteEmailInput" type="email" placeholder="waiter@email.com" style="flex:1; min-width:220px;" />
        <button id="btnAddInvite" class="btn-primary" type="button">Add waiter</button>
      </div>

      <div id="invitesList" style="margin-top:10px; font-size:12px; opacity:.95;"></div>
    </div>

    <div id="hudMsg" class="small" style="margin-top:10px;"></div>
  </div>
`;if(nr)throw Sc(nr),nr;window.addEventListener("error",e=>{e?.message,e?.filename,e?.lineno,e?.colno});window.addEventListener("unhandledrejection",e=>{String(e?.reason?.message||e?.reason)});let Te="public",ea=!1,Ts=0,ze="login";const z={role:"waiter",mode:"login",managerPackage:"single_manager",seatPlan:"15",restaurantCount:"3"},_={session:null,profile:null,restaurant:null,invites:[]};let en=null,As=0;const Ac=1e4;let ke={key:"",loadedAt:0,rows:null},ct=null;const Bc=12e4,Mc=15e3,xc=15e3,Lc=1e4,kc=2e4,Nc=2e4;let or={rid:"",loadedAt:0},sn={rid:"",loadedAt:0,rows:null},Pt={rid:"",loadedAt:0,rows:null};function Na(e,t,n){return e&&String(e.rid||"")===String(n||"")&&Date.now()-Number(e.loadedAt||0)<Number(t||0)}function Pn(e=null){const t=String(e||"");(!t||String(or.rid||"")===t)&&(or={rid:"",loadedAt:0}),(!t||String(sn.rid||"")===t)&&(sn={rid:"",loadedAt:0,rows:null}),(!t||String(Pt.rid||"")===t)&&(Pt={rid:"",loadedAt:0,rows:null})}function Pc(e=""){const t=String(e||"").toLowerCase();return t.includes("refresh")||t.includes("claim")||t.includes("signup")||t.includes("login.ok")||t.includes("logout")}function ue(e="premium"){const t=_?.session||null,n=_?.profile||null,r=jt(),a=F(n||null)||n?.role||"waiter",s=window.getActiveRestaurantId?.()||_?.activeRestaurantId||n?.restaurant_id||_?.restaurant?.id||null,i=Number(window.__BC_IFRAME_EPOCH__||0),l=e??"premium",c=t?.user?.id||null,o=n?.user_id||c||null,d=n?.scope_id||null,p=n?.scope_type||null,m=n?.access_tier||"demo";return{session:t,profile:n,requestedMode:l,mode:l,epoch:i,userId:c,profileUserId:o,membershipRole:a,role:a,membership_role:a,gameplayRole:a,gameplay_role:a,scopeId:d,scopeType:p,accessTier:m,restaurantId:s,activeRestaurantId:s,progressionOwnerUserId:r.userId||o,progressionOwnerRestaurantId:r.restaurantId||s,progressionOwner:r,ctxReady:!!c&&!!a&&(String(l).toLowerCase()==="demo"||!!s),premiumIframeMounted:!!document.getElementById("premiumRootFrame")?.contentWindow,lastSourceCtx:window.__BC_LAST_SOURCE_CTX__||null}}function ln(e="premium"){return!!ue(e).ctxReady}function cn(){const e=document.getElementById("premiumRootFrame"),t=Number(window.__BC_IFRAME_EPOCH__||e?.dataset?.bcEpoch||0),n=e?.contentWindow?.__BC_CTX__||null,r=Number(e?.contentWindow?.__BC_EPOCH__||0);return!!n?.userId&&!!n?.restaurantId&&!!(n?.membershipRole||n?.role)&&(t?r===t:!0)}window.__BC_PARENT_STATE__={get:ue,isCtxReady:ln,isPremiumIframeHealthy:cn};window.__BC_PARENT_SMOKE_TEST__=function(){const t=ue("premium"),n=document.getElementById("premiumRootFrame"),r=n?.contentWindow||null,a=r?.__BC_STATE__?.get?.()||null,s=r?.__BC_IFRAME_SMOKE_TEST__?.()||null,i=r?.__BC_CTX__||null,l=Number(r?.__BC_EPOCH__||0),c=Number(window.__BC_IFRAME_EPOCH__||n?.dataset?.bcEpoch||0),o=[{id:"parent_ctx_ready",ok:!!t.ctxReady,value:t.ctxReady},{id:"iframe_mounted",ok:!!r,value:!!r},{id:"iframe_healthy",ok:cn(),value:cn()},{id:"epoch_match",ok:!!c&&l===c,value:{parentEpoch:c,iframeEpoch:l}},{id:"user_match",ok:!!t.userId&&!!i?.userId&&t.userId===i.userId,value:{parentUserId:t.userId||null,iframeUserId:i?.userId||null}},{id:"restaurant_match",ok:!!t.activeRestaurantId&&!!i?.restaurantId&&t.activeRestaurantId===i.restaurantId,value:{parentRestaurantId:t.activeRestaurantId||null,iframeRestaurantId:i?.restaurantId||null}},{id:"role_match",ok:!!t.membershipRole&&!!(i?.membershipRole||i?.membership_role||i?.role)&&t.membershipRole===(i?.membershipRole||i?.membership_role||i?.role),value:{parentRole:t.membershipRole||null,iframeRole:i?.membershipRole||i?.membership_role||i?.role||null}},{id:"iframe_state_ready",ok:a?.stateHealth==="ready",value:a?.stateHealth||null}],d=o.filter(p=>!p.ok).map(p=>p.id);return{ok:d.length===0,summary:d.length?`failed:${d.join(",")}`:"ok",parent:t,iframe:{epoch:l,ctx:i,state:a,smoke:s},checks:o}};(function(){if(window.__BC_AUTH_WATCHDOG__)return;window.__BC_AUTH_WATCHDOG__=!0;function t(r){try{document.getElementById("premiumRootFrame")?.remove()}catch{}try{const a=document.getElementById("premiumRoot");a&&(a.innerHTML="")}catch{}try{const a=document.getElementById("gameRootDemo");a&&(a.innerHTML="")}catch{}try{const a=document.getElementById("btnLogout");a&&(a.style.display="none")}catch{}try{K("screenHome")}catch{}window.__BC_PENDING_START_DRILL__=null,window.BC_PENDING_START_DRILL=null,console.warn("[AUTH_WATCHDOG] enforced logged-out UI:",r)}const n=()=>{if(document.hidden)return;if(!!!window.appState?.session){const a=document.getElementById("premiumRoot"),s=!!document.getElementById("premiumRootFrame"),i=a?a.innerHTML.trim().length>0:!1;(s||i)&&t("interval.detected_premium_without_session")}};n(),window.__BC_AUTH_WATCHDOG_TICK__=window.setInterval(n,2500)})();let Xn=null;function gi(){return Xn||(Xn=Object.freeze({waiter:Object.freeze({membershipRole:"waiter",gameplayRole:"waiter",canPlay:!0,canInviteWaiters:!1,canManageRestaurant:!1,canManageGroup:!1,canManageEnterprise:!1,canUseIntuit:!1,hasManagerControls:!1}),single_manager:Object.freeze({membershipRole:"single_manager",gameplayRole:"single_manager",canPlay:!0,canInviteWaiters:!0,canManageRestaurant:!0,canManageGroup:!1,canManageEnterprise:!1,canUseIntuit:!1,hasManagerControls:!0}),group_manager:Object.freeze({membershipRole:"group_manager",gameplayRole:"group_manager",canPlay:!0,canInviteWaiters:!0,canManageRestaurant:!0,canManageGroup:!0,canManageEnterprise:!1,canUseIntuit:!1,hasManagerControls:!0}),enterpriser:Object.freeze({membershipRole:"enterpriser",gameplayRole:"enterpriser",canPlay:!0,canInviteWaiters:!0,canManageRestaurant:!0,canManageGroup:!0,canManageEnterprise:!0,canUseIntuit:!0,hasManagerControls:!0}),demo:Object.freeze({membershipRole:"demo",gameplayRole:"demo",canPlay:!0,canInviteWaiters:!1,canManageRestaurant:!1,canManageGroup:!1,canManageEnterprise:!1,canUseIntuit:!1,hasManagerControls:!1})}),Xn)}function F(e){const t=gi(),n=typeof e=="string"?e:e?.membershipRole??e?.membership_role??e?.role??"",r=String(n||"").trim().toLowerCase();return t[r]?r:"waiter"}function Dc(e){return gi()[F(e)]}const Bs=Object.freeze({waiter:Object.freeze({canAccessManagerBoard:!1,canOpenSetupPremium:!1,canInviteWaiters:!1,canReadInvites:!1,canAssignDrills:!1,canAssignTimedChallenges:!1,canUseManagerAbilities:!1,canManageMultipleRestaurants:!1,canUseEnterpriseControls:!1,canImportEnterpriseMedia:!1}),single_manager:Object.freeze({canAccessManagerBoard:!0,canOpenSetupPremium:!0,canInviteWaiters:!0,canReadInvites:!0,canAssignDrills:!0,canAssignTimedChallenges:!0,canUseManagerAbilities:!0,canManageMultipleRestaurants:!1,canUseEnterpriseControls:!1,canImportEnterpriseMedia:!1}),group_manager:Object.freeze({canAccessManagerBoard:!0,canOpenSetupPremium:!0,canInviteWaiters:!0,canReadInvites:!0,canAssignDrills:!0,canAssignTimedChallenges:!0,canUseManagerAbilities:!0,canManageMultipleRestaurants:!0,canUseEnterpriseControls:!1,canImportEnterpriseMedia:!1}),enterpriser:Object.freeze({canAccessManagerBoard:!0,canOpenSetupPremium:!0,canInviteWaiters:!0,canReadInvites:!0,canAssignDrills:!0,canAssignTimedChallenges:!0,canUseManagerAbilities:!0,canManageMultipleRestaurants:!0,canUseEnterpriseControls:!0,canImportEnterpriseMedia:!0})});function J(e){const t=F(e);return Bs[t]||Bs.waiter}function pi(e){const t=String(typeof e=="string"?e:e?.membershipRole??e?.membership_role??e?.role??"").trim().toLowerCase(),n=F(t);return t==="manager"?["manager","single_manager"]:t==="enterprise_admin"?["enterprise_admin","enterpriser"]:n==="single_manager"?["single_manager","manager"]:n==="group_manager"?["group_manager"]:n==="enterpriser"?["enterpriser","enterprise_admin"]:n?[n]:[]}function Ue(e){return!!Dc(e).hasManagerControls}function rt(e){switch(F(e)){case"waiter":return"Waiter";case"single_manager":return"Manager";case"group_manager":return"Group Manager";case"enterpriser":return"Enterpriser";default:return"Unknown"}}function dn(e){return typeof e=="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(e)}function Ms(){const e=F(_?.profile||null),t=window.getActiveRestaurantId?.()||_.activeRestaurantId||_.profile?.restaurant_id||null;return Ue(e)&&dn(t)}function Me(e,t,n){const r=F(e),a=String(n||"");return!a||r==="waiter"?!1:Oc(t).includes(a)}function Oc(e){const t=e||{},n=F(t),r=String(t?.restaurant_id||t?.restaurantId||""),a=Array.isArray(window.__BC_ALLOWED_RESTAURANT_IDS__)?window.__BC_ALLOWED_RESTAURANT_IDS__.map(s=>String(s||"")).filter(Boolean):[];return n==="single_manager"?r?[r]:[]:n==="group_manager"||n==="enterpriser"?a.length?a:r?[r]:[]:[]}function j(){const e=_?.profile?.scope_id||null,t=window.__BC_ACTIVE_MANAGER_RESTAURANT_ID__||window.__BC_ACTIVE_RESTAURANT_ID__||Qe?.(e)||null;return t?String(t):String(_?.restaurant?.id||_?.profile?.restaurant_id||_?.profile?.restaurantId||"")||null}function He(e){const t=String(e||"");if(!t)return!1;const n=_?.profile||{};return Me(n,n,t)?(window.__BC_ACTIVE_MANAGER_RESTAURANT_ID__=t,_.activeRestaurantId=t,Gt(n?.scope_id||null,t),setTimeout(()=>{try{Pa()}catch{}},0),_.restaurant||(_.restaurant={}),_.restaurant.id=t,!0):(console.warn("[MB] denied active restaurant switch",{rid:t,role:F(n)}),!1)}function Sr(e){return`bc_active_restaurant_id::${e||"noscope"}`}function Qe(e=window.appState?.profile?.scope_id||null){try{return localStorage.getItem(Sr(e))||null}catch{return null}}function Gt(e=window.appState?.profile?.scope_id||null,t=null){if(t)try{localStorage.setItem(Sr(e),t)}catch{}}function _i(e=null,t=null){return`bc_selected_difficulty_v1::${e||"nouser"}::${t||"norestaurant"}`}function $c(e=null,t=null){try{const n=localStorage.getItem(_i(e,t));if(n==null)return null;const r=Number(n);return r<=1?1:r>=3?3:2}catch{return null}}function Uc(e=null,t=null,n=null){const r=Number(n),a=r<=1?1:r>=3?3:2;try{localStorage.setItem(_i(e,t),String(a))}catch{}}function Pa(){const e=_?.profile?.user_id||_?.session?.user?.id||null,t=j?.()||_?.activeRestaurantId||_?.restaurant?.id||_?.profile?.restaurant_id||null,n=$c(e,t);if(n==null)return!1;_.difficulty=n;try{mr?.("difficulty_set",{difficulty:n})}catch(r){console.warn("[HUD] difficulty hydrate post failed",r)}return gs?.(),!0}_.activeRestaurantId=Qe();window.__BC_APP_STATE__=_;_.progressionView=_.progressionView||{level:"Building recognition",focus:"Reading guest intent",next:"Keep playing encounters",note:null};_._lastAllowedTier=_._lastAllowedTier||1;_.runState=_.runState||{inRun:!1,encounterId:null,level:1,chapter:1,tier:1,read:null,mode:null,hook:null,drift:{vec:null,persist:0},momentum:0,selectivity:0,authority:0,recovery:null,turn:0,log:[]};window.__BC_ABILITY_LIBRARY__=window.__BC_ABILITY_LIBRARY__||[{id:"closing_surge",family:"attribute",title:"Closing Surge",description:"Boost your closing pressure for a short time.",unlocked:!0,available:!0,active:!1,usesRemaining:1,durationSec:120,allowedRoles:["waiter","single_manager","group_manager","enterpriser"],allowedModes:["premium"],allowedSurfaces:["gameplay_panel","manager_board"],gameplayUsable:!0,scope:"self",activationRules:{requireCtx:!0,requirePremium:!0,requireEncounter:!0,allowDuringDrill:!0,oncePerEncounter:!0},payload:{focus:"closing",strength:1}},{id:"recovery_focus",family:"attribute",title:"Recovery Focus",description:"Gain better recovery control for a short time.",unlocked:!0,available:!0,active:!1,usesRemaining:1,durationSec:120,allowedRoles:["waiter","single_manager","group_manager","enterpriser"],allowedModes:["premium"],allowedSurfaces:["gameplay_panel","manager_board"],gameplayUsable:!0,scope:"self",activationRules:{requireCtx:!0,requirePremium:!0,requireEncounter:!0,allowDuringDrill:!0,oncePerEncounter:!0},payload:{focus:"recovery",strength:1}},{id:"calm_floor",family:"area",title:"Calm Floor",description:"Reduce encounter pressure for a short time.",unlocked:!0,available:!0,active:!1,usesRemaining:1,durationSec:180,allowedRoles:["waiter","single_manager","group_manager","enterpriser"],allowedModes:["premium"],allowedSurfaces:["gameplay_panel","manager_board"],gameplayUsable:!0,scope:"encounter",activationRules:{requireCtx:!0,requirePremium:!0,requireEncounter:!0,allowDuringDrill:!0,oncePerEncounter:!0},payload:{effect:"pressure_down",strength:1}},{id:"premium_window",family:"area",title:"Premium Window",description:"Improve premium opportunity conditions briefly.",unlocked:!0,available:!0,active:!1,usesRemaining:1,durationSec:180,allowedRoles:["waiter","single_manager","group_manager","enterpriser"],allowedModes:["premium"],allowedSurfaces:["gameplay_panel","manager_board"],gameplayUsable:!0,scope:"encounter",activationRules:{requireCtx:!0,requirePremium:!0,requireEncounter:!0,allowDuringDrill:!0,oncePerEncounter:!0},payload:{effect:"premium_bias_up",strength:1}}];window.__BC_ACTIVE_ABILITIES__=window.__BC_ACTIVE_ABILITIES__||[];window.__BC_ABILITY_ENCOUNTER_USAGE__=window.__BC_ABILITY_ENCOUNTER_USAGE__||{};window.__BC_ABILITY_UI__=window.__BC_ABILITY_UI__||{hudFamily:"attribute"};let ta=null;window.__BC_DEBUG__={get session(){return _.session},get profile(){return _.profile}};window.appState=window.__BC_APP_STATE__;const Hc=fc();let tn=null;function Er(){if(tn)return tn;const e=_.session?.user?.email||null,t=_.restaurant?.code||_.profile?.restaurant_id||null,n=_.profile?.scope_id||null;return!e||!t?null:(tn=Hc.init({email:e,license:t,groupId:n}),window.BottleCaller=window.BottleCaller||{},window.BottleCaller.progression=tn,tn)}function Gc(e){const t=String(e?.code||"").toUpperCase(),n=String(e?.message||"");return t==="42P01"||/does not exist|undefined table|schema cache/i.test(n)}function Wc(e){const t=String(e?.code||"").toUpperCase(),n=String(e?.message||"");return t==="42703"||/could not find the '[^']+' column|column "?[^"\s]+"? does not exist|schema cache/i.test(n)}function Fc(e){const t=String(e?.message||""),n=t.match(/Could not find the '([^']+)' column/i)||t.match(/column "?([^"\s]+)"? does not exist/i);return n?.[1]?String(n[1]):null}const xs=["user_id","occurred_at","performance_grade","chain_signal","chain_score","is_green","is_red","tier","chosen_guest_type","chosen_mode","chosen_hook","actual_guest_type","read_correct","delivery_correct","mode_status","hook_status","reflection","reaction_summary","step_reaction_trail","step_spine","ai_perception","bottle_served","chosen_path","best_path"];async function fi({restaurantId:e,userId:t=null,sinceIso:n=null,limit:r=20}={}){let a=[...xs];for(let s=0;s<xs.length;s+=1){let i=I.from("bc_encounter_resolutions_v2").select(a.join(", ")).eq("restaurant_id",e).neq("mode","demo").order("occurred_at",{ascending:!1}).limit(r);t&&(i=i.eq("user_id",t)),n&&(i=i.gte("occurred_at",n));const l=await i;if(!l?.error||!Wc(l.error))return l;const c=Fc(l.error);if(!c||!a.includes(c))return l;console.warn("[MB][PERFORMANCE] bc_encounter_resolutions_v2 missing column, retrying without it",{missingColumn:c}),a=a.filter(o=>o!==c)}return{data:[],error:new Error("Unable to query bc_encounter_resolutions_v2 with any compatible column set.")}}function At(e=null){const t=e?.user_id||e?.userId||null,n=e?.restaurant_id||e?.restaurantId||null;window.__BC_PROGRESS_OWNER_USER_ID__=t,window.__BC_ACTIVE_WAITER_USER_ID__=t,window.__BC_ACTIVE_WAITER_RESTAURANT_ID__=n,console.log("[BC progression owner set]",{userId:t,restaurantId:n,source:e})}function jt(){return{userId:window.__BC_PROGRESS_OWNER_USER_ID__||window.__BC_ACTIVE_WAITER_USER_ID__||null,restaurantId:window.__BC_ACTIVE_WAITER_RESTAURANT_ID__||null}}function yi(e,t){return`bc_prog_reset_marker_${e}_${t}`}function qc({userId:e,restaurantId:t}){if(!e||!t)return null;const n=`bc_prog_v1_${e}_${t}`,r=`bc_skills_v2_${e}_${t}`,a=yi(e,t);try{localStorage.removeItem(n)}catch{}try{localStorage.removeItem("bc_prog_v1_fallback_premium")}catch{}try{localStorage.removeItem("bc_premium_encounter_index")}catch{}try{localStorage.removeItem(r)}catch{}try{localStorage.setItem(a,String(Date.now()))}catch{}return{progKey:n,skillsKey:r,resetMarkerKey:a}}function Da(e={},t=null){return e?.targetUserId||e?.waiterUserId||e?.receiver_user_id||e?.activeProfile?.user_id||e?.membership?.user_id||window.__BC_PROGRESS_OWNER_USER_ID__||window.__BC_ACTIVE_WAITER_USER_ID__||e?.profile?.user_id||t?.user?.id||null}function Oa(e={}){return e?.restaurantId||e?.activeProfile?.restaurant_id||e?.membership?.restaurant_id||window.__BC_ACTIVE_WAITER_RESTAURANT_ID__||e?.profile?.restaurant_id||null}async function Rr({userId:e=null,restaurantId:t=null,activeProfile:n=null,membership:r=null,targetUserId:a=null,waiterUserId:s=null,receiver_user_id:i=null}={}){const l=_.session||null,c=_.profile||null,o=jt(),d=Da({targetUserId:a||e||o.userId||null,waiterUserId:s,receiver_user_id:i,activeProfile:n,profile:n||c||null,membership:r,restaurantId:t||n?.restaurant_id||r?.restaurant_id||o.restaurantId||_.activeRestaurantId||c?.restaurant_id||null},l),p=Oa({restaurantId:t||n?.restaurant_id||r?.restaurant_id||o.restaurantId||_.activeRestaurantId||c?.restaurant_id||null,activeProfile:n,profile:n||c||null,membership:r});if(console.log("[BC progression hydrate target]",{authUserId:l?.user?.id||null,authProfileUserId:c?.user_id||null,progressionOwnerUserId:d,progressionOwnerRestaurantId:p,ownerCtx:o,explicitArgs:{userId:e,restaurantId:t,targetUserId:a,waiterUserId:s,receiver_user_id:i,activeProfile:n,membership:r}}),!d||!p)return console.warn("[BC progression hydrate] missing owner identity",{authUserId:l?.user?.id||null,progressionOwnerUserId:d,progressionOwnerRestaurantId:p}),null;At({user_id:d,restaurant_id:p});const g=Er()?.actions?.hydrateFromCanonicalState;if(typeof g!="function")return null;try{const{data:w,error:S}=await I.from("bc_progression_state_v1").select("*").eq("user_id",d).eq("restaurant_id",p).maybeSingle();if(console.log("[BC progression hydrate result]",{authUserId:l?.user?.id||null,progressionOwnerUserId:d,progressionOwnerRestaurantId:p,found:!!w,error:S?.message||null}),S&&!Gc(S)&&console.warn("[PROGRESSION STATE] dedicated load failed",S),!S&&w?.canonical_state&&typeof w.canonical_state=="object")return g(w.canonical_state)}catch(w){console.warn("[PROGRESSION STATE] dedicated load failed, falling back",w)}const{data:u,error:f}=await I.from("bc_skill_snapshots_v1").select("payload, created_at").eq("user_id",d).eq("restaurant_id",p).order("created_at",{ascending:!1}).limit(1).maybeSingle();if(f||!u?.payload||typeof u.payload!="object")return null;const h=u.payload.progressionState||u.payload.progression_state||null;return!h||typeof h!="object"?null:g(h)}window.getActiveRestaurantId=window.getActiveRestaurantId||function(){const t=window.appState;return window.__BC_ACTIVE_MANAGER_RESTAURANT_ID__||t?.activeRestaurantId||Qe?.()||t?.profile?.restaurant_id||null};window.__BC_ACTIVE_REST_READY__=window.__BC_ACTIVE_REST_READY__||new Promise(e=>{window.__BC_RESOLVE_ACTIVE_REST_READY__=e});function jc(){window.__BC_ACTIVE_REST_READY__=new Promise(e=>{window.__BC_RESOLVE_ACTIVE_REST_READY__=e})}function Ir(){window.__BC_RESOLVE_ACTIVE_REST_READY__&&(window.__BC_RESOLVE_ACTIVE_REST_READY__(),window.__BC_RESOLVE_ACTIVE_REST_READY__=null)}function hi(){return Array.isArray(window.__BC_ABILITY_LIBRARY__)?window.__BC_ABILITY_LIBRARY__:[]}function wi(e){return hi().find(t=>String(t?.id||"")===String(e||""))||null}function bi(e){const t=String(e||"").toLowerCase();return hi().filter(n=>String(n?.family||"").toLowerCase()===t)}function Je(){return Array.isArray(window.__BC_ACTIVE_ABILITIES__)?window.__BC_ACTIVE_ABILITIES__:[]}function vi(e){return Je().some(t=>String(t?.id||"")===String(e||""))}function Vc(){const e=window.__BC_CTX__||{},t=window.__BC_IDENTITY__||{},n=e.membershipRole||e.membership_role||t.membershipRole||e.role||null,r=String(e.mode||window.bcMode||"demo").toLowerCase();return{role:n?String(n).toLowerCase():null,mode:r,isDemo:r==="demo"}}function $a(e,t="gameplay_panel"){if(!e)return!1;const n=Vc(),r=String(n.role||"").toLowerCase(),a=String(n.mode||"").toLowerCase(),s=Array.isArray(e.allowedRoles)?e.allowedRoles:[],i=Array.isArray(e.allowedModes)?e.allowedModes:[],l=Array.isArray(e.allowedSurfaces)?e.allowedSurfaces:[];return!(s.length&&!s.includes(r)||i.length&&!i.includes(a)||l.length&&!l.includes(t))}function Si(){try{return document.getElementById("premiumRootFrame")?.contentWindow||null}catch{return null}}function Ei(){const e=Si(),t=e?.__BC_CTX__||null,n=window.__BC_CTX__?.mode||t?.mode||e?.bcMode||window.bcMode||"demo",r=document.getElementById("screenPlay"),a=e?.document?.getElementById?.("screenPlay")||null;return{hasCtx:!!(window.__BC_CTX__?.userId||t?.userId),isDemo:String(n).toLowerCase()==="demo",isInEncounter:!!(window.currentEncounter||e?.currentEncounter),isOnPlayScreen:!!r&&!r.classList.contains("hidden")||!!a&&!a.classList.contains("hidden"),sessionType:String(window.__BC_SESSION_TYPE__||window.sessionType||e?.__BC_SESSION_TYPE__||e?.sessionType||"normal").toLowerCase(),hasAssignedDrill:!!(window.__BC_LAST_ASSIGNED_DRILL__?.id||e?.__BC_LAST_ASSIGNED_DRILL__?.id)}}function Ri(){const e=Si(),t=window.currentEncounter||e?.currentEncounter||null,n=t?.id||t?.key||t?.encounterId||window.encounterIndex||e?.encounterIndex||"unknown";return String(n)}function Ii(e){const t=Ri();return!!window.__BC_ABILITY_ENCOUNTER_USAGE__?.[t]?.[e]}function Kc(e){const t=Ri();window.__BC_ABILITY_ENCOUNTER_USAGE__=window.__BC_ABILITY_ENCOUNTER_USAGE__||{},window.__BC_ABILITY_ENCOUNTER_USAGE__[t]=window.__BC_ABILITY_ENCOUNTER_USAGE__[t]||{},window.__BC_ABILITY_ENCOUNTER_USAGE__[t][e]=!0}function lr(e){const t=String(e||"").toLowerCase();return Je().find(n=>String(n?.family||"").toLowerCase()===t)||null}function Yc(e){if(!e)return null;const t=String(e.family||"").toLowerCase();return t?lr(t):null}function Ua(e){if(!e)return{ok:!1,reason:"missing_ability"};const t=Ei(),n=e.activationRules||{};if(n.requireCtx&&!t.hasCtx)return{ok:!1,reason:"ctx_required"};if(n.requirePremium&&t.isDemo)return{ok:!1,reason:"premium_required"};if(n.requireEncounter&&!t.isInEncounter)return{ok:!1,reason:"encounter_required"};if(n.allowDuringDrill===!1&&t.sessionType==="drill")return{ok:!1,reason:"blocked_during_drill"};if(n.oncePerEncounter&&Ii(e.id))return{ok:!1,reason:"already_used_this_encounter"};const r=Yc(e);return r&&String(r.id||"")!==String(e.id||"")?{ok:!1,reason:"family_conflict",conflictAbilityId:r.id||null,conflictTitle:r.title||null}:{ok:!0,reason:null}}function zc(e){const t=Ua(e);if(t.ok)return"";switch(t.reason){case"ctx_required":return"Ctx required";case"premium_required":return"Premium only";case"encounter_required":return"Only during encounters";case"blocked_during_drill":return"Blocked during drill";case"already_used_this_encounter":return"Used this encounter";case"family_conflict":return t.conflictTitle?`Active: ${t.conflictTitle}`:"Family already active";default:return"Unavailable"}}function Ha(e,t="gameplay_panel"){return!(!e||!$a(e,t)||!e.unlocked||!e.available||Number(e.usesRemaining||0)<=0||vi(e.id)||!Ua(e).ok&&t==="gameplay_panel")}function ga(e){const t=String(e||"attribute").toLowerCase()==="area"?"area":"attribute";window.__BC_ABILITY_UI__.hudFamily=t;const n=document.getElementById("btnHudAbilitiesAttribute"),r=document.getElementById("btnHudAbilitiesArea"),a=document.getElementById("hudAbilitiesAttributeList"),s=document.getElementById("hudAbilitiesAreaList");n&&(n.classList.toggle("btn",t==="attribute"),n.classList.toggle("btn-ghost",t!=="attribute")),r&&(r.classList.toggle("btn",t==="area"),r.classList.toggle("btn-ghost",t!=="area")),a&&(a.classList.toggle("hidden",t!=="attribute"),a.style.display=t==="attribute"?"flex":"none"),s&&(s.classList.toggle("hidden",t!=="area"),s.style.display=t==="area"?"flex":"none")}function Ls(e,t){const n=document.getElementById(t);if(!n)return;const r=bi(e).filter(a=>$a(a,"gameplay_panel"));if(n.innerHTML="",!r.length){n.innerHTML='<div class="small-text" style="opacity:.7;">No abilities in this family yet.</div>';return}for(const a of r){const s=vi(a.id),i=Ha(a,"gameplay_panel"),l=!s&&!i?zc(a):"",c=document.createElement("div");c.className="card",c.style.padding="10px",c.style.display="flex",c.style.flexDirection="column",c.style.gap="8px";const o=s?"Active":i?`Ready • ${Number(a.usesRemaining||0)} use left`:l||(Number(a.usesRemaining||0)<=0?"No uses left":"Unavailable");c.innerHTML=`
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
        <div style="min-width:0;">
          <div style="font-weight:600;">${y(a.title||"Ability")}</div>
          <div class="small-text" style="opacity:.8; margin-top:2px;">
            ${y(a.description||"")}
          </div>
        </div>
        <div class="small-text" style="opacity:.75; white-space:nowrap;">${y(o)}</div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
        <div class="small-text" style="opacity:.75;">
          Duration: ${Number(a.durationSec||0)}s
        </div>
        <button type="button" class="${i?"btn":"btn-ghost"}" ${i?"":"disabled"}>
          ${s?"Active":"Activate"}
        </button>
      </div>
    `;const d=c.querySelector("button");d&&i&&d.addEventListener("click",()=>{Zc(a.id)}),n.appendChild(c)}}function ks(e){const t=bi(e).filter(l=>$a(l,"gameplay_panel")),n=lr(e),r=Ei();if(n){const l=Math.max(0,Math.ceil(((n.expiresAt||0)-Date.now())/1e3));return{status:"Active",meta:`${n.title||n.id} • ${l}s left`,tone:"active"}}return r.hasCtx?r.isDemo?{status:"Blocked",meta:"Premium only",tone:"blocked"}:r.isInEncounter?t.some(l=>Ha(l,"gameplay_panel"))?{status:"Ready",meta:"Slot available",tone:"ready"}:t.some(l=>!!(l.activationRules||{}).oncePerEncounter&&Ii(l.id))?{status:"Spent",meta:"Used this encounter",tone:"spent"}:t.some(l=>Number(l.usesRemaining||0)>0)?{status:"Blocked",meta:"Unavailable",tone:"blocked"}:{status:"Empty",meta:"No uses left",tone:"spent"}:{status:"Waiting",meta:"Only during encounters",tone:"idle"}:{status:"Blocked",meta:"Ctx required",tone:"blocked"}}function Ns(e,t){const n=document.getElementById(e);n&&(n.style.borderColor="rgba(255,255,255,0.08)",n.style.opacity="1",t==="active"?n.style.borderColor="rgba(255,255,255,0.18)":t==="ready"?n.style.borderColor="rgba(255,255,255,0.12)":t==="blocked"?n.style.opacity=".9":t==="spent"&&(n.style.opacity=".75"))}function Ci(){const e=ks("attribute"),t=ks("area"),n=document.getElementById("hudAttributeSlotStatus"),r=document.getElementById("hudAttributeSlotMeta"),a=document.getElementById("hudAreaSlotStatus"),s=document.getElementById("hudAreaSlotMeta");n&&(n.textContent=e.status||"-"),r&&(r.textContent=e.meta||"-"),a&&(a.textContent=t.status||"-"),s&&(s.textContent=t.meta||"-"),Ns("hudAttributeSlotCard",e.tone),Ns("hudAreaSlotCard",t.tone)}function Cr(){Ci(),Ls("attribute","hudAbilitiesAttributeList"),Ls("area","hudAbilitiesAreaList"),Ti(),Mi(),ad(),ga(window.__BC_ABILITY_UI__?.hudFamily||"attribute")}function Qc(e){switch(String(e||"")){case"closing_surge":return"Closing boosted";case"recovery_focus":return"Recovery steadier";case"calm_floor":return"Pressure reduced";case"premium_window":return"Premium chance up";default:return"Active"}}function Ti(){const e=document.getElementById("hudActiveEffectsList"),t=document.getElementById("hudAbilitiesStatus");if(!e)return;const n=Je();if(e.innerHTML="",!n.length){e.innerHTML='<div style="opacity:.7;">No active abilities.</div>',t&&(t.textContent="No active effects");return}if(t){const r=Jc(),a=[];r.attribute?.title&&a.push(`Attribute: ${r.attribute.title}`),r.area?.title&&a.push(`Area: ${r.area.title}`),t.textContent=a.length?a.join(" • "):"No active effects"}for(const r of n){const a=document.createElement("div");a.style.display="flex",a.style.justifyContent="space-between",a.style.alignItems="center",a.style.gap="8px";const s=Math.max(0,Math.ceil(((r.expiresAt||0)-Date.now())/1e3));a.innerHTML=`
      <div>
        <div style="font-weight:600;">${y(r.title||r.id||"Ability")}</div>
        <div style="opacity:.75;">${y(Qc(r.id))} • ${s}s left</div>
      </div>
    `,e.appendChild(a)}}function Jc(){return{attribute:lr("attribute"),area:lr("area")}}function Xc(e){e&&(window.__BC_LAST_USED_ABILITY__={id:e.id,family:e.family,at:Date.now()},console.log("[ABILITY] applied ✅",{id:e.id,family:e.family,payload:e.payload||null}),e.family==="attribute"?window.showToast?.(`${e.title} activated ✅`):e.family==="area"&&window.showToast?.(`${e.title} activated ✅`))}function Ai(e){const t=String(e||"");if(!t)return;const n=Je().filter(a=>String(a?.id||"")!==t);window.__BC_ACTIVE_ABILITIES__=n;const r=wi(t);r&&(r.active=!1),console.log("[ABILITY] expired",{id:t}),Cr(),pn()}function Zc(e){const t=wi(e);if(!t||!Ha(t,"gameplay_panel"))return!1;if(!Ua(t).ok)return window.showToast?.("Ability not available right now."),!1;t.active=!0,t.usesRemaining=Math.max(0,Number(t.usesRemaining||0)-1),Kc(t.id);const r={id:t.id,title:t.title,family:t.family,startedAt:Date.now(),expiresAt:Date.now()+Number(t.durationSec||0)*1e3,payload:t.payload||{}};window.__BC_ACTIVE_ABILITIES__=[...Je().filter(a=>String(a?.id||"")!==String(t.id||"")),r],Xc(t),Cr(),pn();try{clearTimeout(t.__expireTimer__)}catch{}return t.__expireTimer__=setTimeout(()=>{Ai(t.id)},Math.max(0,Number(t.durationSec||0)*1e3)),!0}function ed(){const e=document.getElementById("btnHudAbilitiesAttribute"),t=document.getElementById("btnHudAbilitiesArea");e&&!e.__bcBound&&(e.__bcBound=!0,e.addEventListener("click",()=>{ga("attribute")})),t&&!t.__bcBound&&(t.__bcBound=!0,t.addEventListener("click",()=>{ga("area")})),Cr()}function td(){if(window.__BC_HUD_ABILITIES_TICK_WIRED__)return;window.__BC_HUD_ABILITIES_TICK_WIRED__=!0;const e=()=>{const t=document.getElementById("hudPanel");if(!t||t.classList.contains("hidden")||document.hidden)return;const n=Je();!Bi()&&window.__BC_ACTIVE_TIMED_CHALLENGE__&&rd("expired");let a=!1;const s=Date.now();for(const i of n)(i.expiresAt||0)<=s&&(Ai(i.id),a=!0);a||(Ci(),n.length&&Ti(),Mi())};e(),window.__BC_HUD_ABILITIES_TICK__=window.setInterval(e,1500)}function un(){const e=document.getElementById("mbOverviewLiveEffects");if(!e)return;const t=ve?.()||{attributeEffects:[],areaEffects:[],updatedAt:0},n=Array.isArray(Je?.())?Je():[],r=(t.attributeEffects||[]).filter(u=>!!u?.active),a=(t.areaEffects||[]).filter(u=>!!u?.active),s=n.filter(u=>String(u?.family||"").toLowerCase()==="attribute"),i=n.filter(u=>String(u?.family||"").toLowerCase()==="area"),l=[...r.map(u=>String(u?.id||"")),...a.map(u=>String(u?.id||""))].filter(Boolean).sort(),c=[...s.map(u=>String(u?.id||"")),...i.map(u=>String(u?.id||""))].filter(Boolean).sort(),o=l.length,d=c.length,p=l.length===c.length&&l.every((u,f)=>u===c[f]);let m="In sync";o===0&&d===0?m="No active effects":o>0&&d===0?m="Sent, waiting on runtime":o===0&&d>0?m="Runtime active without synced state":p||(m="Mismatch detected");const g=(u=[],f="None")=>u.length?u.map(h=>{const w=Number(h?.expiresAt||0),S=w?Math.max(0,Math.ceil((w-Date.now())/1e3)):null,E=h?.title||h?.name||h?.id||"Effect",b=h?.description||h?.body||"";return`
        <div style="padding:8px; border:1px solid rgba(255,255,255,0.08); border-radius:10px;">
          <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
            <div style="font-weight:600;">${y(E)}</div>
            <div class="small-text" style="opacity:.75;">
              ${S!=null?`${S}s left`:"active"}
            </div>
          </div>
          ${b?`<div class="small-text" style="opacity:.8; margin-top:4px;">${y(b)}</div>`:""}
        </div>
      `}).join(""):`<div class="small-text" style="opacity:.7;">${y(f)}</div>`;e.innerHTML=`
    <div class="card" style="display:flex; flex-direction:column; gap:12px; padding:12px;">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
        <div style="font-weight:600;">Live Effects</div>
        <div class="small-text" style="opacity:.75;">
          Last manager update ${t.updatedAt?new Date(t.updatedAt).toLocaleTimeString():"just now"}
        </div>
      </div>

      <div class="small-text" style="opacity:.82;">
        Live Controls effects sent to the waiter experience, compared with the current game runtime.
      </div>

      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <div style="padding:8px 10px; border:1px solid rgba(255,255,255,0.08); border-radius:999px;" class="small-text">
          Sent: ${o}
        </div>
        <div style="padding:8px 10px; border:1px solid rgba(255,255,255,0.08); border-radius:999px;" class="small-text">
          Runtime: ${d}
        </div>
        <div style="padding:8px 10px; border:1px solid rgba(255,255,255,0.08); border-radius:999px;" class="small-text">
          Status: ${y(m)}
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:12px;">
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="font-weight:600;">Sent to Game: Attribute</div>
          ${g(r,"No attribute effects sent")}
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="font-weight:600;">Sent to Game: Area</div>
          ${g(a,"No area effects sent")}
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:12px;">
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="font-weight:600;">Game Runtime: Attribute</div>
          ${g(s,"No runtime attribute effects")}
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="font-weight:600;">Game Runtime: Area</div>
          ${g(i,"No runtime area effects")}
        </div>
      </div>
    </div>
  `}function Bi(){const e=window.__BC_ACTIVE_TIMED_CHALLENGE__||null;return e&&Number(e.expiresAt||0)>Date.now()?e:null}function yt(e){const t=String(e||"").toLowerCase();return{comparison:"Display Method: Comparison",pairing:"Display Method: Pairing",value_justification:"Display Method: Value Justification"}[t]||"Display Method Challenge"}function nd(){const e=window.__BC_ACTIVE_DISPLAY_METHOD_CHALLENGE__||null;return e&&Number(e.expiresAt||0)>Date.now()?e:null}function rd(e="expired"){const t=window.__BC_ACTIVE_TIMED_CHALLENGE__||null;t&&(window.__BC_LAST_TIMED_CHALLENGE_RESULT__={id:t.id||null,title:t.title||"Timed Challenge",challengeKey:t.challengeKey||null,status:e,endedAt:Date.now()},window.__BC_ACTIVE_TIMED_CHALLENGE__=null)}function Mi(){const e=document.getElementById("hudTimedChallengeStatus"),t=document.getElementById("hudTimedChallengeBody");if(!e||!t)return;const n=Bi(),r=window.__BC_PENDING_TIMED_CHALLENGE__||null;if(!n){if(r){e.textContent="Queued • Starts after encounter 1",t.innerHTML=`
        <div><b>${y(r.title||"Timed Challenge")}</b></div>
        <div style="opacity:.85;">Focus: ${y(r?.payload?.focus||r?.focus||"-")}</div>
        <div style="opacity:.85;">Reward: ${Number(r?.payload?.rewardPoints||r?.rewardPoints||0)} pts</div>
      `;return}e.textContent="No active challenge",t.innerHTML='<div style="opacity:.7;">No challenge assigned.</div>';return}const a=Math.max(0,Math.ceil(((n.expiresAt||0)-Date.now())/1e3));e.textContent=`Active • ${a}s left`,t.innerHTML=`
    <div><b>${y(n.title||"Timed Challenge")}</b></div>
    <div style="opacity:.85;">Focus: ${y(n?.payload?.focus||"-")}</div>
    <div style="opacity:.85;">Reward: ${Number(n?.payload?.rewardPoints||0)} pts</div>
  `}function ad(){const e=document.getElementById("hudDisplayMethodChallengeStatus"),t=document.getElementById("hudDisplayMethodChallengeBody");if(!e||!t)return;const n=nd(),r=window.__BC_PENDING_DISPLAY_METHOD_CHALLENGE__||null;if(!n){if(r){e.textContent=String(r?.placement||"before_start")==="after_first_encounter"?"Queued • Starts after encounter 1":"Queued • Starts next encounter",t.innerHTML=`
        <div><b>${y(r.title||"Display Method Challenge")}</b></div>
        <div style="opacity:.85;">Method: ${y(yt(r?.methodKey||r?.payload?.methodKey))}</div>
        <div style="opacity:.85;">Reward: ${Number(r?.payload?.rewardPoints||r?.rewardPoints||0)} pts</div>
      `;return}e.textContent="No active challenge",t.innerHTML='<div style="opacity:.7;">No challenge assigned.</div>';return}const a=Math.max(0,Math.ceil(((n.expiresAt||0)-Date.now())/1e3));t.innerHTML=`
    <div><b>${y(n.title||"Display Method Challenge")}</b></div>
    <div style="opacity:.85;">Method: ${y(yt(n?.methodKey||n?.payload?.methodKey))}</div>
    <div style="opacity:.85;">Reward: ${Number(n?.payload?.rewardPoints||n?.rewardPoints||0)} pts</div>
  `,e.textContent=`Active • ${a}s left`}function Xe(e){const t=String(e||"").toLowerCase();return{closing_push:"Closing Push",recovery_window:"Recovery Window",clean_close:"Clean Close",soft_close:"Soft Close",successful_pivot:"Successful Pivot",read_first:"Read First",full_delivery:"Full Delivery",no_reset_run:"No Reset Run",stable_signal:"Stable Signal",controlled_table:"Controlled Table",solid_interaction:"Solid Interaction",premium_moment:"Premium Moment",commanding_presence:"Commanding Presence"}[t]||(t?t.replace(/_/g," ").replace(/\b\w/g,r=>r.toUpperCase()):"Timed Challenge")}function xi(){const e=document.getElementById("mbOverviewTimedChallenge");if(!e)return;const t=Gi(),n=Ga();if(!t){e.innerHTML=`
      <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
        <div style="font-weight:600;">Timed Challenge</div>
        <div class="small" style="opacity:.75;">No active timed challenge.</div>
        ${n?`
          <div class="small" style="opacity:.85;">
            Last result: <b>${y(Xe(n?.payload?.challengeKey))}</b> •
            ${y(rn(n)?.label||"Result")}
            ${rn(n)?.strongestSkill?` • Strongest skill: ${y(rn(n)?.strongestSkill)}`:""}
          </div>
        `:""}
      </div>
    `;return}const r=t?.payload||{};e.innerHTML=`
    <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
      <div style="font-weight:600;">Timed Challenge</div>
      <div><b>${y(Xe(r?.challengeKey))}</b></div>
      <div class="small" style="opacity:.85;">Focus: ${y(r?.focus||"-")}</div>
      <div class="small" style="opacity:.85;">Reward: ${Number(r?.rewardPoints||0)} pts</div>
      <div class="small" style="opacity:.85;">Target: ${y(gn(t))}</div>
      <div class="small" style="opacity:.85;">Sent: ${y(ht(t?.created_at))}</div>
      ${n?`
        <div class="small" style="opacity:.75; margin-top:4px;">
          Last result: ${y(rn(n)?.label||"Result")} •
          ${y(ht(n?.created_at))}
        </div>
      `:""}
    </div>
  `}function Li(){return[...Vt()].filter(t=>{const n=String(t?.type||"");return n==="display_method_challenge"||n==="display_method_challenge_completed"||n==="display_method_challenge_expired"}).sort((t,n)=>new Date(n?.created_at||0).getTime()-new Date(t?.created_at||0).getTime()).slice(0,5)}function ki(){return Li().find(e=>String(e?.type||"")==="display_method_challenge")||null}function Ni(){return Li().find(e=>{const t=String(e?.type||"");return t==="display_method_challenge_completed"||t==="display_method_challenge_expired"})||null}function Pi(e){return String(e?.type||"")==="display_method_challenge"?Oi(e):mn(e?.sender_user_id||null)}function rr(e){const t=String(e?.type||""),n=e?.payload||{},r=yt(n?.methodKey||n?.challengeKey);return t==="display_method_challenge"?{label:"Challenge Sent",title:r}:t==="display_method_challenge_completed"?{label:"Completed",title:r}:t==="display_method_challenge_expired"?{label:"Expired",title:r}:null}function Tr(){const e=ki(),t=Ni(),n=e?t?new Date(e?.created_at||0).getTime()>=new Date(t?.created_at||0).getTime()?e:t:e:t,r=document.getElementById("mbLcDisplayMethodRecentSummary");if(!r)return;if(!n){r.innerHTML=`
      <div style="font-weight:600;">Recent Display Method Activity</div>
      <div class="small-text" style="margin-top:4px; opacity:.75;">No recent display method activity.</div>
    `;return}const a=rr(n),s=Pi(n),i=ht(n?.created_at);r.innerHTML=`
    <div style="font-weight:600;">Recent Display Method Activity</div>
    <div class="small-text" style="margin-top:4px; opacity:.92;">${y(a?.label||"Result")} • ${y(a?.title||"Display Method Challenge")}</div>
    <div class="small-text" style="margin-top:4px; opacity:.75;">${y([s,i].filter(Boolean).join(" • "))}</div>
  `}function Di(){const e=document.getElementById("mbOverviewDisplayMethodChallenge");if(!e)return;const t=ki(),n=Ni();if(!t){e.innerHTML=`
      <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
        <div style="font-weight:600;">Display Method Challenge</div>
        <div class="small" style="opacity:.75;">No active display method challenge.</div>
        ${n?`
          <div class="small" style="opacity:.85;">
            Last result: <b>${y(rr(n)?.title||"Display Method Challenge")}</b> •
            ${y(rr(n)?.label||"Result")}
          </div>
        `:""}
      </div>
    `;return}const r=t?.payload||{};e.innerHTML=`
    <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
      <div style="font-weight:600;">Display Method Challenge</div>
      <div><b>${y(yt(r?.methodKey||r?.challengeKey))}</b></div>
      <div class="small" style="opacity:.85;">Method: ${y(yt(r?.methodKey||r?.challengeKey))}</div>
      <div class="small" style="opacity:.85;">Reward: ${Number(r?.rewardPoints||0)} pts</div>
      <div class="small" style="opacity:.85;">Target: ${y(Pi(t))}</div>
      <div class="small" style="opacity:.85;">Sent: ${y(ht(t?.created_at))}</div>
      ${n?`
        <div class="small" style="opacity:.75; margin-top:4px;">
          Last result: ${y(rr(n)?.label||"Result")} •
          ${y(ht(n?.created_at))}
        </div>
      `:""}
    </div>
  `}function Vt(){return window.__BC_MB_MESSAGES__||window.__BC_MESSENGER_ROWS__||[]}function sd(){return window.__BC_MB_STAFF_ROWS__||window.__BC_MB_WAITERS__||[]}function mn(e){const t=String(e||"");if(!t)return"Unknown waiter";const r=sd().find(a=>String(a?.user_id||a?.id||"")===t);return r?r.display_name||r.full_name||r.name||r.email||`Waiter ${t.slice(0,8)}`:`Waiter ${t.slice(0,8)}`}function Oi(e){const n=(e?.payload||{})?.targetUserId||e?.receiver_user_id||null;return mn(n)}function gn(e){if(String(e?.type||"")==="timed_challenge")return Oi(e);const n=e?.sender_user_id||null;return mn(n)}function $i(){return[...Vt()].filter(t=>{const n=String(t?.type||"");return n==="timed_challenge"||n==="timed_challenge_completed"||n==="timed_challenge_expired"}).sort((t,n)=>{const r=new Date(t?.created_at||0).getTime();return new Date(n?.created_at||0).getTime()-r}).slice(0,5)}function Ui(){return[...Vt()].filter(t=>String(t?.type||"")==="drill_override").sort((t,n)=>{const r=new Date(t?.created_at||0).getTime();return new Date(n?.created_at||0).getTime()-r})[0]||null}function Hi(){return[...Vt()].filter(t=>String(t?.type||"")==="drill_completed").sort((t,n)=>{const r=new Date(t?.created_at||0).getTime();return new Date(n?.created_at||0).getTime()-r})[0]||null}function ht(e){const t=new Date(e||0).getTime();if(!t)return"Recent";const n=Date.now()-t,r=Math.max(0,Math.floor(n/1e3));return r<60?`${r}s ago`:r<3600?`${Math.floor(r/60)}m ago`:r<86400?`${Math.floor(r/3600)}h ago`:`${Math.floor(r/86400)}d ago`}function Gi(){return[...Vt()].filter(t=>String(t?.type||"")==="timed_challenge").sort((t,n)=>{const r=new Date(t?.created_at||0).getTime();return new Date(n?.created_at||0).getTime()-r})[0]||null}function Ga(){return[...Vt()].filter(t=>{const n=String(t?.type||"");return n==="timed_challenge_completed"||n==="timed_challenge_expired"}).sort((t,n)=>{const r=new Date(t?.created_at||0).getTime();return new Date(n?.created_at||0).getTime()-r})[0]||null}function id(e=null){if(!e)return"No recent challenge activity.";const t=String(e?.type||"").toLowerCase(),n=e?.payload||{},r=_t(n);return t==="timed_challenge"?`${r} sent`:t==="timed_challenge_completed"?`${r} completed`:t==="timed_challenge_expired"?`${r} expired`:"No recent challenge activity."}function Dn(){const e=Gi(),t=Ga(),n=(()=>{if(!e)return t;if(!t)return e;const c=new Date(e?.created_at||0).getTime(),o=new Date(t?.created_at||0).getTime();return c>=o?e:t})(),r=id(n),a=n?ht(n?.created_at):"",i=[n?gn(n):"",a].filter(Boolean).join(" • "),l=n?`
      <div style="font-weight:600;">Recent Challenge Activity</div>
      <div class="small-text" style="margin-top:4px; opacity:.92;">
        ${y(r)}
      </div>
      <div class="small-text" style="margin-top:4px; opacity:.75;">
        ${y(i)}
      </div>
    `:`
      <div style="font-weight:600;">Recent Challenge Activity</div>
      <div class="small-text" style="margin-top:4px; opacity:.75;">
        No recent challenge activity.
      </div>
    `;["mbTimedChallengeRecentSummary","mbLcTimedChallengeRecentSummary"].forEach(c=>{const o=document.getElementById(c);o&&(o.innerHTML=l)})}function Wi(){const e=document.getElementById("mbOverviewRecentChallenges");if(!e)return;const t=$i(),n=document.createElement("div");n.className="card",n.style.display="flex",n.style.flexDirection="column",n.style.gap="8px",n.style.padding="12px";const r=document.createElement("div");if(r.style.fontWeight="600",r.textContent="Recent Challenge History",n.appendChild(r),!t.length){const a=document.createElement("div");a.className="small",a.style.opacity=".75",a.textContent="No recent timed challenge activity.",n.appendChild(a),e.innerHTML="",e.appendChild(n);return}for(const a of t){const s=rn(a),i=a?.payload||{},l=s?.label||"Timed Challenge",c=s?.title||Xe(i?.challengeKey),o=s?.strongestSkill||null,d=gn(a),p=ht(a?.created_at),m=document.createElement("div");m.style.padding="8px 0",m.style.borderTop="1px solid rgba(255,255,255,0.06)",m.innerHTML=`
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
        <div style="min-width:0;">
          <div style="font-weight:600;">${y(l)}</div>
          <div class="small" style="opacity:.85; margin-top:4px;">
            ${y(c)} • ${y(d)}
            ${o?` • Strongest skill: ${y(o)}`:""}
          </div>
          <div class="small" style="opacity:.7; margin-top:4px;">
            ${y(a?.body||"")}
          </div>
        </div>
        <div class="small" style="opacity:.7; white-space:nowrap;">${y(p)}</div>
      </div>
    `,n.appendChild(m)}e.innerHTML="",e.appendChild(n)}function rn(e){const t=String(e?.type||""),n=e?.payload||{},r=n?.challengeKey||null,a=Xe(r);return t==="timed_challenge"?{kind:"assigned",label:"Challenge Sent",title:a,strongestSkill:null}:t==="timed_challenge_completed"?{kind:"completed",label:"Completed",title:a,strongestSkill:n?.strongestSkill||null}:t==="timed_challenge_expired"?{kind:"expired",label:"Expired",title:a,strongestSkill:null}:null}function pn(){un(),O("renderManagerLiveControlPanels",()=>Mn?.())}function Fi(){return Mn?.()}function od(){if(window.__BC_MB_ABILITIES_TICK_WIRED__)return;window.__BC_MB_ABILITIES_TICK_WIRED__=!0;const e=()=>{if(document.hidden)return;const t=document.getElementById("screenManagerBoard");if(!t||t.classList.contains("hidden"))return;const n=document.getElementById("mbTab_overview"),r=document.getElementById("mbTab_messenger"),a=document.getElementById("mbTab_live_controls"),s=n&&!n.classList.contains("hidden"),i=r&&!r.classList.contains("hidden"),l=a&&!a.classList.contains("hidden");s&&(xi(),Di(),Wi(),yr()),i&&(Dn(),Tr(),yr(),In()),l&&(pn(),Jo?.())};e(),window.__BC_MB_ABILITIES_TICK__=window.setInterval(e,1500)}async function qi(e){if(!e)return[];const{data:t,error:n}=await I.from("bc_scope_restaurants").select("restaurant_id, restaurants:restaurants(id,name,code,seat_limit,require_invite)").eq("scope_id",e).order("created_at",{ascending:!0});return n?(console.warn("[MB] fetchAllowedRestaurantsForScope failed",n),[]):(t||[]).map(r=>r.restaurants).filter(Boolean)}async function ji(){const e=window.appState,t=e?.profile?.scope_id||null,n=String(e?.profile?.scope_type||"").toLowerCase();if(n!=="group"&&n!=="enterprise")return e.activeRestaurantId=e?.profile?.restaurant_id||null,{ok:!0,activeRestaurantId:e.activeRestaurantId,allowed:[]};const r=await qi(t),a=new Set(r.map(c=>c.id));let l=Qe(t)||e.activeRestaurantId||e?.profile?.restaurant_id||null;return(!l||!a.has(l))&&(l=r[0]?.id||null),e.activeRestaurantId=l,l&&Gt(t,l),{ok:!!l,activeRestaurantId:l,allowed:r}}async function Wa(){const e=await ji();console.log("[MB] active restaurant resolved",e),e.ok&&(Ir(),document.getElementById("screenManagerBoard")&&!document.getElementById("screenManagerBoard").classList.contains("hidden")&&await ae())}window.__BC_BUILD_CTX__=function(t=null){const n=window.appState,r=n?.session?.user?.id??null,a=F(n?.profile||null)||null,s=a||n?.profile?.role||null,i=n?.profile?.scope_id??null,l=n?.profile?.scope_type??null,c=n?.profile?.access_tier??"demo",o=window.getActiveRestaurantId?.()??null;return{userId:r,restaurantId:o,scopeId:i,scopeType:l,accessTier:c,membershipRole:a,role:s,membership_role:a,gameplayRole:a,gameplay_role:a,mode:t??"premium"}};const ut=10,Ps=["Red fruit","Dark fruit","Citrus","Stone fruit","Tropical","Floral","Herbal/Green","Spicy","Earthy/Savory","Smoky"],Ds=["Silky","Chalky tannins","Firm tannins","Racy acidity","Creamy","Full-bodied","Medium-bodied","Light-bodied","Fresh","Bold"],Os=["None","Light","Subtle","Noticeable"];function Vi(){return j?.()||window.__BC_ACTIVE_MANAGER_RESTAURANT_ID__||_?.activeRestaurantId||_?.profile?.restaurant_id||_?.restaurant?.id||null}function Zn(e,t,n,r,a){const s=document.getElementById(e);s&&(s.innerHTML="",t.forEach(i=>{const l=document.createElement("button");l.type="button",l.className="option-btn",l.textContent=i;const c=()=>{const o=r();l.classList.toggle("selected",o.includes(i))};l.addEventListener("click",()=>{const o=[...r()],d=o.indexOf(i);if(d>=0)o.splice(d,1);else{if(o.length>=n)return;o.push(i)}a(o),c()}),c(),s.appendChild(l)}))}function $s(e,t,n,r){const a=document.getElementById(e);a&&(a.innerHTML="",t.forEach(s=>{const i=document.createElement("button");i.type="button",i.className="option-btn",i.textContent=s;const l=()=>{i.classList.toggle("selected",n()===s)};i.addEventListener("click",()=>{r(s),[...a.querySelectorAll("button")].forEach(c=>c.classList.remove("selected")),l()}),l(),a.appendChild(i)}))}function pa(e){const t=document.getElementById("wineCountPremium");t&&(t.textContent=`${e} / ${ut}`)}function dt(e){return!e||e.fruitTags||e.oakLevel?e:{id:e.id,restaurantId:e.restaurant_id,createdBy:e.created_by,name:e.name,varietal:e.varietal,fruitTags:Array.isArray(e.fruit_tags)?e.fruit_tags:[],textureTags:Array.isArray(e.texture_tags)?e.texture_tags:[],oakLevel:e.oak_level??"",process:e.process??"",region:e.region??"",story:e.story??"",createdAt:e.created_at,updatedAt:e.updated_at}}function Ki(e){if(!e||typeof e!="object")return"";const t=String(e.name||"").trim().toLowerCase(),n=String(e.varietal||"").trim().toLowerCase(),r=String(e.region||"").trim().toLowerCase(),a=String(e.story||"").trim().toLowerCase();if(t||n||r||a)return`shape:${t}::${n}::${r}::${a}`;const s=String(e.id||"").trim();return s?`id:${s}`:""}function cr(e=[]){const t=Array.isArray(e)?e:[],n=new Set,r=[];for(const a of t){const s=Ki(a);!s||n.has(s)||(n.add(s),r.push(a))}return r}function Nt(e){const t=Array.isArray(e)?e:[],n=document.getElementById("premiumWineTableBody"),r=document.getElementById("premiumWineCards");n&&(n.innerHTML=""),r&&(r.innerHTML=""),pa(t.length);const a=String(Vi()||_?.restaurant?.id||_?.activeRestaurantId||_?.profile?.restaurant_id||"").trim(),s=String(j()||"").trim(),i=Array.from(new Set([a,s].filter(Boolean)));i.length&&i.forEach(l=>ee(l,t.slice())),t.forEach((l,c)=>{const o=l||{};if(n){const d=document.createElement("tr");d.innerHTML=`
        <td>${y(o.name||`Wine ${c+1}`)}</td>
        <td>${y(o.varietal||"")}</td>
        <td>${y(Array.isArray(o.fruitTags)?o.fruitTags.join(", "):Array.isArray(o.fruit_tags)?o.fruit_tags.join(", "):"")}</td>
        <td>${y(Array.isArray(o.textureTags)?o.textureTags.join(", "):Array.isArray(o.texture_tags)?o.texture_tags.join(", "):"")}</td>
        <td>${y(o.oakLevel||o.oak_level||"")}</td>
        <td>${y(o.process||"")}</td>
        <td>${y(o.region||"")}</td>
        <td>${y(o.story||"")}</td>
        <td><button type="button" class="btn-danger" data-wine-del="${y(String(o.id||o.wine_id||o.created_at||c))}">Delete</button></td>
      `,n.appendChild(d)}if(r){const d=document.createElement("div");d.className="wine-card",d.innerHTML=`
        <div><strong>${y(o.name||`Wine ${c+1}`)}</strong> — ${y(o.varietal||"")}</div>
        <div>${y((Array.isArray(o.fruitTags)?o.fruitTags:o.fruit_tags||[]).join(", "))} · ${y((Array.isArray(o.textureTags)?o.textureTags:o.texture_tags||[]).join(", "))} · ${y(o.oakLevel||o.oak_level||"")}</div>
        <div>${y(o.region||"")} ${o.process?"· "+y(o.process):""}</div>
        <div>${y(o.story||"")}</div>
        <button type="button" class="btn-danger" data-wine-del="${y(String(o.id||o.wine_id||o.created_at||c))}">Delete</button>
      `,r.appendChild(d)}})}function $e(e=null){const t=String(e||"").trim(),n=t?xn(t):[];if(n.length)return n;const r=xn();if(r.length)return r;const a=Array.isArray(_n?.()?.wines)?_n().wines:[];return a.length?a:[]}window.__BC_PARENT_TRACE__||(window.__BC_PARENT_TRACE__=!0,window.addEventListener("message",e=>{const t=e?.data;if(t?.source==="BC_MSG"){if((t.type==="wines_report"||t.type==="wines_sync")&&Array.isArray(t.wines)){const n=String(t.restaurantId||"").trim(),r=String(j()||_?.restaurant?.id||_?.activeRestaurantId||"").trim(),a=n||r,s=Array.isArray(t.wines)?t.wines:[];if(a&&s.length){if(n&&!r)try{He(n)}catch{}ee(a,s),n&&r&&n!==r&&ee(n,s),(document.getElementById("mbTimedChallengeWine")||document.getElementById("mbLcTimedChallengeWine"))&&Et().catch(console.warn)}else if(a&&!s.length){const i=xn(a);i.length?console.warn(`[PARENT] ignoring empty ${t.type} to preserve existing cache`,{rid:a,req:t.reqId||null,cachedCount:i.length}):console.warn(`[PARENT] ignoring empty ${t.type} with no cached wines`,{rid:a,req:t.reqId||null})}}console.log("[PARENT] got",t,"origin:",e.origin,"from iframe?",e.source===document.getElementById("premiumRootFrame")?.contentWindow)}}),console.log("parent listener armed"));async function dr(){try{const{data:e}=await I.auth.getSession();return e?.session||null}catch{return null}}async function he(){try{const{data:e,error:t}=await I.auth.getSession();if(t)return null;const n=e?.session??null,r=n?.user?.id??null;return!n||!r?null:{session:n,userId:r}}catch{return null}}function Ne(e,t,n,r={},a={}){const s=t?.userId??null,i=t?.restaurantId??null,l=a.requireRestaurant??!0,c=Array.isArray(a.allowedRoles)?a.allowedRoles.map(p=>String(p).toLowerCase()):null,o=F({membership_role:t?.membership_role??t?.membershipRole??null,role:t?.role??null}),d=(p,m={})=>{try{e.source?.postMessage({source:"BC_MSG",v:1,type:n,ok:!1,error:p,...r,...m},e.origin)}catch{}return null};return dn(s)?l&&!dn(i)?d("invalid_ctx_restaurant"):c&&c.length&&!pi(o).some(m=>c.includes(m))?d("forbidden_role"):{userId:s,profileUserId:t?.profileUserId??t?.profile_user_id??s,progressionOwnerUserId:t?.progressionOwnerUserId??t?.progression_owner_user_id??null,progressionOwnerRestaurantId:t?.progressionOwnerRestaurantId??t?.progression_owner_restaurant_id??null,restaurantId:i,role:o,membershipRole:t?.membershipRole??t?.membership_role??o,membership_role:t?.membership_role??t?.membershipRole??o,gameplayRole:t?.gameplayRole??t?.gameplay_role??o,gameplay_role:t?.gameplay_role??t?.gameplayRole??o,scopeId:t?.scopeId??null,scopeType:t?.scopeType??t?.scope_type??null,accessTier:t?.accessTier??t?.access_tier??null,mode:t?.mode??null}:d("invalid_ctx_user")}function Pe(e,t,n,r={}){const a=Number(window.__BC_IFRAME_EPOCH__||0),s=Number(t?.epoch||0);if(!a||s!==a){try{e.source?.postMessage({source:"BC_MSG",v:1,type:n,ok:!1,error:"epoch_mismatch",...r},e.origin)}catch{}return!0}return!1}function Ie(e,t){return String(t?.mode||"").toLowerCase()==="demo"||String(e?.mode||"").toLowerCase()==="demo"||String(e?.payload?.mode||"").toLowerCase()==="demo"||String(e?.payload?.bcMode||"").toLowerCase()==="demo"}const ld=new Set(["bc_ctx_request","logout","bc_logout_request","nav","nav_back","ctx_retry",x.PROGRESSION_SNAPSHOT_REQUEST,"debug_progress_payload","debug_skill_tree"]),cd=new Set([x.WINES_REQUEST,x.WINES_MUTATE,x.RUNS_COUNT_REQUEST,x.RITUAL_STATUS_REQUEST,"event_log",x.PROGRESSION_SNAPSHOT_REQUEST,x.PROGRESS_REPORT_SUBMIT,x.MESSAGES_UNREAD_REQUEST,x.MESSAGE_MARK_READ,x.LEADERBOARD_REQUEST]);async function na(e=null){const t=await dr();if(!t)return null;_.session=t;const n=window.appState,r=n?.session?.user?.id??null,a=n?.profile??null;if(!r||!a?.role)return null;const s=F(a)||null,i=s,l=a?.scope_type??null,c=a?.access_tier??"demo",o=jt();if(String(e||"").toLowerCase()==="demo")return{userId:r,profileUserId:a?.user_id??r,progressionOwnerUserId:o.userId||a?.user_id||r,progressionOwnerRestaurantId:o.restaurantId||null,restaurantId:null,scopeId:null,scopeType:null,accessTier:c,membershipRole:s,role:s||a?.role||null,membership_role:s,gameplayRole:i,gameplay_role:i,mode:"demo",drill:null};const m=window.getActiveRestaurantId?.()??a?.restaurant_id??null;return m?{userId:r,profileUserId:a?.user_id??r,progressionOwnerUserId:o.userId||a?.user_id||r,progressionOwnerRestaurantId:o.restaurantId||m,restaurantId:m,scopeId:a?.scope_id??null,scopeType:l,accessTier:c,membershipRole:s,role:s||a?.role||null,membership_role:s,gameplayRole:i,gameplay_role:i,mode:e??"premium",drill:window.__BC_DRILL_CONFIG__||window.BC_DRILL_CONFIG||null}:null}if(!window.__BC_PARENT_BRIDGE__){let e=function(r,a){if(!(!r||r===window||!a))try{window.__BC_SOURCE_CTX_MAP__||(window.__BC_SOURCE_CTX_MAP__=new WeakMap),window.__BC_SOURCE_CTX_MAP__.set(r,{epoch:Number(window.__BC_IFRAME_EPOCH__||0),mode:String(a.mode||""),userId:a.userId||null,profileUserId:a.profileUserId||a.profile_user_id||a.userId||null,progressionOwnerUserId:a.progressionOwnerUserId||a.progression_owner_user_id||null,progressionOwnerRestaurantId:a.progressionOwnerRestaurantId||a.progression_owner_restaurant_id||null,restaurantId:a.restaurantId||null,role:a.role||null,membershipRole:a.membershipRole||a.membership_role||null,membership_role:a.membership_role||null,gameplayRole:a.gameplayRole||a.gameplay_role||null,gameplay_role:a.gameplay_role||null,scopeId:a.scopeId||null,scopeType:a.scopeType||a.scope_type||null,accessTier:a.accessTier||a.access_tier||null,at:Date.now()})}catch{}},t=function(r){try{const a=window.__BC_SOURCE_CTX_MAP__?.get(r)||null;if(!a)return null;const s=Number(window.__BC_IFRAME_EPOCH__||0);return s&&a.epoch&&a.epoch!==s||Date.now()-(a.at||0)>18e5?null:a}catch{return null}},n=function(r){try{return r?(r.__BC_SRC_ID__||(r.__BC_SRC_ID__=crypto.randomUUID().slice(0,8)),r.__BC_SRC_ID__):"null"}catch{return"no_tag"}};if(window.__BC_PARENT_BRIDGE__={loadGroupRestaurantsForPicker:vo,setActiveRestaurantForGroup:Eo,mountPremiumGameIframe:Wt},window.__BC_BUILD_CTX_SAFE__=na,window.__BC_SOURCE_CTX_MAP__=window.__BC_SOURCE_CTX_MAP__||new WeakMap,!window.__BC_BRIDGE__){let r=function(g,u,f={}){return(h={})=>{try{g.source?.postMessage({source:"BC_MSG",v:1,type:u,...f,...h},g.origin)}catch{}}};async function a({requestedMode:g,msg:u,event:f}){const h=document.getElementById("bcPremiumFrame")||document.getElementById("premiumRootFrame");if(!!!(h&&f?.source===h.contentWindow))return null;const S=ue(g??"premium"),E=Number(S.epoch||0);if(Number(u?.epoch||0)!==E)return null;if(String(g||"").toLowerCase()==="demo"){const T=await na("demo");return T&&e(f.source,T),T}try{window.__BC_ACTIVE_REST_READY__&&await Promise.race([window.__BC_ACTIVE_REST_READY__,new Promise(T=>setTimeout(T,600))])}catch{}const B=String(g||"").toLowerCase()!=="demo",L=S.activeRestaurantId,k=await dr();if(k&&(window.appState.session=k),!(!!k&&ln(g??"premium")&&(B?!!L:!0))){try{f.source?.postMessage({source:"BC_MSG",v:1,type:"ctx_not_ready",ok:!1,epoch:Number(window.__BC_IFRAME_EPOCH__||0),retryAfterMs:250,why:"profile_or_restaurant_not_ready"},f.origin)}catch{}return null}const R=await na(g??null);return R&&(R.drill=window.__BC_DRILL_CONFIG__||window.BC_DRILL_CONFIG||null,e(f.source,R)),!R?.userId||!R?.role||!R?.restaurantId&&B?null:R}async function s({mode:g,event:u}){const f=document.getElementById("bcPremiumFrame")||document.getElementById("premiumRootFrame");if(!!!(f&&u?.source===f.contentWindow))return[];const w=t(u.source),S=w?.userId||null,E=w?.restaurantId||null,b=await dr();if(!b||!dn(S)||!dn(E))return[];if(window.appState.session=b,b?.user?.id!==S)return[];if(String(g||"").toLowerCase()==="demo")return[];const{data:B,error:L}=await I.from("bc_wines").select("*").eq("restaurant_id",E).order("created_at",{ascending:!0});if(L)throw L;return B||[]}async function i(g,u,f){if(!g||!u||!f)return 0;const{data:h,error:w}=await g.from("bc_run_counts_v1").select("runs_count").eq("user_id",u).eq("restaurant_id",f).maybeSingle();if(w)return console.warn("[BC] runs_count fallback -> 0",w),0;const S=Number(h?.runs_count||0);return console.log("[BC] runs_count view ->",{userId:u,restaurantId:f,runsCount:S}),S}async function l({supabase:g,userId:u,restaurantId:f,msg:h}){const w=g||I||window.__SB__||window.sb||window.supabase,S=window.__BC_CTX__||{},E=u||h?.userId||h?.user_id||S.userId||S.user_id||null,b=f||h?.restaurantId||h?.restaurant_id||S.restaurantId||S.restaurant_id||window.__BC_ACTIVE_RESTAURANT_ID__||null;return{ok:!0,count:await i(w,E,b)}}const c=new Set([x.LOGOUT_REQUEST,x.CTX_REQUEST,x.WINES_REQUEST,x.WINES_MUTATE,x.RUNS_COUNT_REQUEST,x.RITUAL_STATUS_REQUEST,x.MESSAGES_UNREAD_REQUEST,x.MESSAGE_MARK_READ,x.LEADERBOARD_REQUEST,x.PROGRESSION_SNAPSHOT_REQUEST,x.PROGRESS_REPORT_SUBMIT,x.HARD_RESET_PROGRESSION,"event_log","drill_run_started","timed_challenge_result","drill_run_completed","logout"]);window.__BC_BRIDGE_HANDLED_TYPES__=c;async function o({msg:g,event:u,replyType:f,extra:h={},allowedRoles:w=["waiter","single_manager","group_manager","enterpriser"],demoPayload:S={},onCtxRejected:E=null}={}){const b=t(u.source),B=(R={})=>{try{u.source?.postMessage({source:"BC_MSG",v:1,type:f,...R},u.origin)}catch{}};if(Ie(g,b))return B({ok:!0,demo:!0,...h,...S}),{ok:!1,demo:!0,senderCtx:b};if(Pe(u,g,f,h))return{ok:!1,senderCtx:b};const L=Ne(u,b,f,h,{requireRestaurant:!0,allowedRoles:w});if(!L){try{E?.()}catch{}return{ok:!1,senderCtx:b}}const k=await he(),v=k?.userId||null;return v?String(v)!==String(L.userId)?(B({ok:!1,error:"forbidden_user",...h}),{ok:!1,senderCtx:b,ctx:L,liveAuthNow:k}):{ok:!0,ctx:L,senderCtx:b,liveAuthNow:k,replyDirect:B}:(B({ok:!1,error:"no_session",...h}),{ok:!1,senderCtx:b,ctx:L})}async function d({id:g,expectedType:u,lookupErrorCode:f,notFoundErrorCode:h,missingSenderErrorCode:w,replyResult:S,logLabel:E}){const{data:b,error:B}=await I.from("bc_messages_v1").select("id, sender_user_id, receiver_user_id, restaurant_id, type, body, payload").eq("id",g).eq("type",u).maybeSingle();if(B)return console.warn(`${E} assigned message lookup failed`,B),S({ok:!1,error:f}),null;if(!b?.id)return console.warn(`${E} assigned message not found`,{id:g,expectedType:u}),S({ok:!1,error:h}),null;const L=b.sender_user_id||null;return L?{assignedMsg:b,managerUserId:L}:(console.warn(`${E} assigned message has no sender_user_id`,b),S({ok:!1,error:w}),null)}async function p({type:g,senderUserId:u,receiverUserId:f,restaurantId:h,limit:w=10,keyName:S,keyValue:E,lookupErrorCode:b,replyResult:B}){const{data:L,error:k}=await I.from("bc_messages_v1").select("id, payload, created_at").eq("type",g).eq("sender_user_id",u).eq("receiver_user_id",f).eq("restaurant_id",h).order("created_at",{ascending:!1}).limit(w);return k?(B({ok:!1,error:b}),{ok:!1,duplicate:!1}):{ok:!0,duplicate:(L||[]).some(R=>String(R?.payload?.[S]||"")===String(E||""))}}const m=Il({allowedOrigin:window.location.origin,debug:!0,handlers:{[x.LOGOUT_REQUEST]:Ss({doLogout:Ft}),logout:Ss({doLogout:Ft}),[x.CTX_REQUEST]:Cl({getBcCtx:a}),[x.WINES_REQUEST]:Tl({fetchWines:s}),[x.WINES_MUTATE]:Al({supabase:I,getSourceCtx:t,isDemoMsg:Ie,rejectIfEpochMismatch:Pe,getSenderCtxOrReject:Ne,getLiveAuthOrNull:he}),[x.RUNS_COUNT_REQUEST]:Bl({fetchRunsCount:l}),[x.RITUAL_STATUS_REQUEST]:Ml({supabase:I,getSourceCtx:t,isDemoMsg:Ie,rejectIfEpochMismatch:Pe,getSenderCtxOrReject:Ne,getLiveAuthOrNull:he}),[x.MESSAGES_UNREAD_REQUEST]:xl({supabase:I,getSourceCtx:t,isDemoMsg:Ie,rejectIfEpochMismatch:Pe,getSenderCtxOrReject:Ne,getLiveAuthOrNull:he}),[x.MESSAGE_MARK_READ]:Ll({supabase:I,getSourceCtx:t,isDemoMsg:Ie,rejectIfEpochMismatch:Pe,getSenderCtxOrReject:Ne,getLiveAuthOrNull:he}),[x.LEADERBOARD_REQUEST]:kl({supabase:I,getSourceCtx:t,isDemoMsg:Ie,rejectIfEpochMismatch:Pe,getSenderCtxOrReject:Ne,getLiveAuthOrNull:he}),[x.PROGRESSION_SNAPSHOT_REQUEST]:Nl({getSourceCtx:t,isDemoMsg:Ie,rejectIfEpochMismatch:Pe,getSenderCtxOrReject:Ne,getLiveAuthOrNull:he,buildProgressionResult:ud,getActiveRestaurantId:()=>window.getActiveRestaurantId?.(),getAppState:()=>window.appState,getIframeEpoch:()=>window.__BC_IFRAME_EPOCH__}),[x.PROGRESS_REPORT_SUBMIT]:Gl({supabase:I,getSourceCtx:t,isDemoMsg:Ie,rejectIfEpochMismatch:Pe,getSenderCtxOrReject:Ne,getLiveAuthOrNull:he}),[x.HARD_RESET_PROGRESSION]:Wl({getSourceCtx:t,isDemoMsg:Ie,rejectIfEpochMismatch:Pe,getSenderCtxOrReject:Ne,getLiveAuthOrNull:he,hardResetProgressionStateOnly:Yi}),...ec({resolveEncounterById:g=>Rc(String(g||"")),getIframeEpoch:()=>window.__BC_IFRAME_EPOCH__}),event_log:async({msg:g,event:u})=>{const f="event_log_ack",h=g?.eventType||null,w=await o({msg:g,event:u,replyType:f,extra:{eventType:h},demoPayload:{eventType:h}});w.ok&&await tc({msg:g,event:u,supabase:I,tagSource:n,ctx:w.ctx,replyType:f})},drill_run_started:async({msg:g,event:u})=>{const f="drill_run_started_result",h=g?.assignedMessageId||null,w=r(u,f,{assignedMessageId:h}),S=await o({msg:g,event:u,replyType:f,extra:{assignedMessageId:h},demoPayload:{assignedMessageId:h},onCtxRejected:()=>console.warn("[DRILL START] ctx rejected")});if(console.log("[PARENT] drill_run_started received ✅",{msg:g,senderCtx:S.senderCtx}),S.demo||!S.ok)return;const E=S.ctx,b=g?.payload||{};if(!h){console.warn("[DRILL START] missing assignedMessageId"),w({ok:!1,error:"missing_assigned_message_id"});return}const B=await d({id:h,expectedType:"drill_override",lookupErrorCode:"assigned_message_lookup_failed",notFoundErrorCode:"assigned_message_not_found",missingSenderErrorCode:"assigned_message_missing_sender",replyResult:w,logLabel:"[DRILL START]"});if(!B)return;const{assignedMsg:L,managerUserId:k}=B;if(String(L.receiver_user_id||"")!==String(E.userId||"")){console.warn("[DRILL START] assigned drill receiver mismatch",{assignedReceiver:L.receiver_user_id,ctxUserId:E.userId}),w({ok:!1,error:"assigned_message_receiver_mismatch"});return}if(String(L.restaurant_id||"")!==String(E.restaurantId||"")){console.warn("[DRILL START] assigned drill restaurant mismatch",{assignedRestaurantId:L.restaurant_id,ctxRestaurantId:E.restaurantId}),w({ok:!1,error:"assigned_message_restaurant_mismatch"});return}const v=await p({type:"drill_started",senderUserId:E.userId,receiverUserId:k,restaurantId:E.restaurantId,limit:10,keyName:"assignedMessageId",keyValue:h,lookupErrorCode:"existing_started_lookup_failed",replyResult:w});if(!v.ok)return;if(v.duplicate){window.__BC_PARENT_LAST_DRILL_STARTED__={assignedMessageId:h,payload:b,senderCtx:S.senderCtx||null,at:Date.now()},ce?.({thread:!0,board:!1,economy:!1,liveControls:!1,challengeMeta:!1}),w({ok:!0,managerUserId:k,duplicate:!0});return}const R=`Drill started • ${b?.focus||"drill"} • ${b?.repTarget??0} reps`,T={scope_type:"restaurant",scope_id:E.scopeId||E.restaurantId,restaurant_id:E.restaurantId,sender_user_id:E.userId,receiver_user_id:k,sender_role:E.membershipRole||E.role||"waiter",type:"drill_started",body:R,payload:{focus:b?.focus??null,repTarget:b?.repTarget??null,durationSec:b?.durationSec??null,tier:b?.tier??null,startedAt:b?.startedAt||Date.now(),assignedMessageId:h}},{error:A}=await I.from("bc_messages_v1").insert(T);if(A){console.warn("[DRILL START] insert failed",A),w({ok:!1,error:"started_insert_failed"});return}window.__BC_PARENT_LAST_DRILL_STARTED__={assignedMessageId:h,payload:b,senderCtx:S.senderCtx||null,at:Date.now()},ce?.({thread:!0,board:!1,economy:!1,liveControls:!1,challengeMeta:!1}),w({ok:!0,managerUserId:k})},timed_challenge_result:async({msg:g,event:u})=>{const f="timed_challenge_result_ack",h=g?.challengeId||null,w=r(u,f,{challengeId:h}),S=await o({msg:g,event:u,replyType:f,extra:{challengeId:h},demoPayload:{challengeId:h}});if(S.demo||!S.ok)return;const E=S.ctx,b=g?.payload||{},B=b?.challengeKey||null,L=String(b?.status||"").toLowerCase(),k=String(b?.title||Xe(B)||"Timed Challenge"),v=b?.targetUserId||E.userId,R=b?.restaurantId||E.restaurantId,T=Number(b?.rewardPoints||0),A=b?.outcome||null;if(!h){w({ok:!1,error:"missing_challenge_id"});return}const W=await d({id:h,expectedType:"timed_challenge",lookupErrorCode:"challenge_lookup_failed",notFoundErrorCode:"challenge_not_found",missingSenderErrorCode:"challenge_missing_sender",replyResult:w,logLabel:"[TIMED CHALLENGE]"});if(!W)return;const{managerUserId:H}=W,P=L==="completed"?"timed_challenge_completed":"timed_challenge_expired",C=await p({type:P,senderUserId:v,receiverUserId:H,restaurantId:R,limit:20,keyName:"challengeId",keyValue:h,lookupErrorCode:"existing_result_lookup_failed",replyResult:w});if(!C.ok)return;if(C.duplicate){w({ok:!0,managerUserId:H,resultType:P,duplicate:!0});return}const D=L==="completed"?`Completed ${k}`:"Challenge Expired",V={scope_type:"restaurant",scope_id:R,restaurant_id:R,sender_user_id:v,receiver_user_id:H,sender_role:E.membershipRole||E.role||"waiter",type:P,body:D,payload:{challengeId:h,challengeKey:B,title:k,status:L,rewardPoints:T,strongestSkill:b?.strongestSkill||null,outcome:A,chainSignal:b?.chainSignal||null,chainScore:b?.chainScore??null,guestReadCorrect:b?.guestReadCorrect??null,deliveryScore:b?.deliveryScore??null,resetUsed:b?.resetUsed??null,premiumSuccess:b?.premiumSuccess??null,strongPillars:b?.strongPillars??null,completedAt:b?.completedAt||Date.now()}},{error:M}=await I.from("bc_messages_v1").insert(V);if(M){w({ok:!1,error:"result_insert_failed"});return}w({ok:!0,managerUserId:H,resultType:P})},display_method_challenge_result:async({msg:g,event:u})=>{const f="display_method_challenge_result_ack",h=g?.challengeId||null,w=r(u,f,{challengeId:h}),S=await o({msg:g,event:u,replyType:f,extra:{challengeId:h},demoPayload:{challengeId:h}});if(S.demo||!S.ok)return;const E=S.ctx,b=g?.payload||{},B=b?.challengeKey||null,L=b?.methodKey||null,k=String(b?.status||"").toLowerCase(),v=String(b?.title||yt(L||B)),R=b?.targetUserId||E.userId,T=b?.restaurantId||E.restaurantId,A=Number(b?.rewardPoints||0),W=b?.outcome||null;if(!h){w({ok:!1,error:"missing_challenge_id"});return}const H=await d({id:h,expectedType:"display_method_challenge",lookupErrorCode:"challenge_lookup_failed",notFoundErrorCode:"challenge_not_found",missingSenderErrorCode:"challenge_missing_sender",replyResult:w,logLabel:"[DISPLAY METHOD CHALLENGE]"});if(!H)return;const{managerUserId:P}=H,C=k==="completed"?"display_method_challenge_completed":"display_method_challenge_expired",D=await p({type:C,senderUserId:R,receiverUserId:P,restaurantId:T,limit:20,keyName:"challengeId",keyValue:h,lookupErrorCode:"existing_result_lookup_failed",replyResult:w});if(!D.ok)return;if(D.duplicate){w({ok:!0,managerUserId:P,resultType:C,duplicate:!0});return}const V=k==="completed"?`Completed ${v}`:"Challenge Expired",M={scope_type:"restaurant",scope_id:T,restaurant_id:T,sender_user_id:R,receiver_user_id:P,sender_role:E.membershipRole||E.role||"waiter",type:C,body:V,payload:{challengeId:h,challengeKey:B,methodKey:L,title:v,status:k,rewardPoints:A,strictness:b?.strictness||null,outcome:W,chainSignal:b?.chainSignal||null,chainScore:b?.chainScore??null,guestReadCorrect:b?.guestReadCorrect??null,deliveryScore:b?.deliveryScore??null,resetUsed:b?.resetUsed??null,premiumSuccess:b?.premiumSuccess??null,modeStatus:b?.modeStatus??null,hookStatus:b?.hookStatus??null,performanceGrade:b?.performanceGrade??null,strongPillars:b?.strongPillars??null,completedAt:b?.completedAt||Date.now()}},{error:N}=await I.from("bc_messages_v1").insert(M);if(N){w({ok:!1,error:"result_insert_failed"});return}w({ok:!0,managerUserId:P,resultType:C})},drill_run_completed:async({msg:g,event:u})=>{const f="drill_run_completed_result",h=g?.assignedMessageId||null,w=r(u,f,{assignedMessageId:h}),S=await o({msg:g,event:u,replyType:f,extra:{assignedMessageId:h},demoPayload:{assignedMessageId:h},onCtxRejected:()=>console.warn("[DRILL RUN] ctx rejected")});if(console.log("[PARENT] drill_run_completed received ✅",{msg:g,senderCtx:S.senderCtx}),S.demo||!S.ok)return;const E=S.ctx,b=g?.payload||{};if(!h){console.warn("[DRILL RUN] missing assignedMessageId"),w({ok:!1,error:"missing_assigned_message_id"});return}const B=await d({id:h,expectedType:"drill_override",lookupErrorCode:"assigned_message_lookup_failed",notFoundErrorCode:"assigned_message_not_found",missingSenderErrorCode:"assigned_message_missing_sender",replyResult:w,logLabel:"[DRILL RUN]"});if(!B)return;const{managerUserId:L}=B,k=await p({type:"drill_completed",senderUserId:E.userId,receiverUserId:L,restaurantId:E.restaurantId,limit:10,keyName:"assignedMessageId",keyValue:h,lookupErrorCode:"existing_completed_lookup_failed",replyResult:w});if(!k.ok)return;if(k.duplicate){w({ok:!0,managerUserId:L,duplicate:!0});return}const v=`Drill completed • ${b?.focus||"drill"} • ${b?.repsDone??0}/${b?.repTarget??0} reps`,R={scope_type:"restaurant",scope_id:E.scopeId||E.restaurantId,restaurant_id:E.restaurantId,sender_user_id:E.userId,receiver_user_id:L,sender_role:E.membershipRole||E.role||"waiter",type:"drill_completed",body:v,payload:{focus:b?.focus??null,repsDone:b?.repsDone??null,repTarget:b?.repTarget??null,durationSec:b?.durationSec??null,assignedMessageId:h}};console.log("[DRILL RUN] inserting completion row ✅",R);const{error:T}=await I.from("bc_messages_v1").insert(R);if(T){console.warn("[DRILL RUN] completion message insert failed",T),w({ok:!1,error:"completion_insert_failed"});return}console.log("[DRILL RUN] drill_completed message inserted ✅",{managerUserId:L,assignedMessageId:h}),w({ok:!0,managerUserId:L})}}});window.__BC_BRIDGE__=m}window.addEventListener("message",async r=>{try{const a=r?.data;if(!a||a.source!=="BC_MSG"||a.v!==1||r.origin!==window.location.origin)return;const s=a.type;if(window.__BC_BRIDGE__&&window.__BC_BRIDGE_HANDLED_TYPES__?.has(s))return;const i=()=>{try{r.source&&typeof r.source.postMessage=="function"&&(r.source.postMessage({source:"BC_MSG",v:1,type:"auth_state",authed:!1},r.origin),r.source.postMessage({source:"BC_MSG",v:1,type:"parent_logged_out"},r.origin))}catch{}};if(oe()){console.warn("[PARENT] BC_MSG blocked: hard logged out",s),i();try{we("hard_logged_out_msg_gate")}catch{}try{gt("hard_logged_out_msg_gate")}catch{}return}if(window.__BC_LOGOUT_LOCK__){console.warn("[PARENT] BC_MSG blocked: logout lock active",s),i();try{we("logout_lock")}catch{}try{gt("logout_lock")}catch{}return}const l=document.getElementById("bcPremiumFrame")||document.getElementById("premiumRootFrame");if(!l||r.source!==l.contentWindow)return;if(a.type==="debug_progress_payload"){console.log("[PARENT][DEBUG_PROGRESS_PAYLOAD]",a.payload);return}if(a.type==="debug_skill_tree"){console.log("[PARENT][DEBUG_SKILL_TREE]",a.tree);return}const c=t(r.source);if(!c&&!ld.has(a.type)){console.warn("[PARENT] blocked msg (no senderCtx yet)",a.type);try{r.source?.postMessage({source:"BC_MSG",v:1,type:"ctx_required",ok:!1,reason:"no_sender_ctx",epoch:Number(window.__BC_IFRAME_EPOCH__||0),retryAfterMs:250,why:"no_sender_ctx"},r.origin)}catch{}return}let o=null;const d=Ie(a,c);if(cd.has(a.type)&&!d){if(o=await he(),!o){console.warn("[PARENT] blocked: no live session",a.type),i();try{we("parent_no_session_db_gate")}catch{}try{gt("parent_no_session_db_gate")}catch{}return}if(_.session=o.session,!c?.userId){r.source?.postMessage({source:"BC_MSG",v:1,type:"ctx_not_ready",ok:!1,reason:"no_sender_ctx_db",epoch:Number(window.__BC_IFRAME_EPOCH__||0),retryAfterMs:250,why:"no_sender_ctx"},r.origin);return}if(String(o.userId)!==String(c.userId)){r.source?.postMessage({source:"BC_MSG",v:1,type:"ctx_required",ok:!1,reason:"forbidden_user",epoch:Number(window.__BC_IFRAME_EPOCH__||0)},r.origin);return}}if(a.type==="nav_back"||a.type==="nav"){if(vd(a))return;const p=String(_?.profile?.role||"").toLowerCase();if(a.type==="nav_back"){const g=String(a.backTo||a.to||"screenPremiumApp"),u=p==="waiter"&&g==="screenManagerBoard"?"screenPremiumApp":g;console.log("[PARENT] NAV_BACK ->",u,a),we("nav_back"),Ye(!1),K(u);return}const m=a.to||a.target||a.backTo||"screenHome";if(console.log("[PARENT] NAV ->",m,a),a.type==="nav"&&a.to==="screenManagerBoard"){if(!Ms()){console.warn("[NAV] blocked -> managerboard (no restaurant-bound access)"),K("screenPremiumApp");return}if(window.__BC_MB_DEFAULTTAB__=a.mbTab||"overview",K("screenManagerBoard"),await Ia?.(),wn?.(),!window.__BC_MB_LOADTAB__){await ae(),we("exit drill -> managerboard"),Ye(!1);return}a.mbTab?(window.__BC_MB_SHOWTAB__?.(a.mbTab),await window.__BC_MB_LOADTAB__?.(a.mbTab)):await window.__BC_MB_LOADTAB__?.(window.__BC_MB_DEFAULTTAB__),we("exit drill -> managerboard"),Ye(!1);return}if(String(m).startsWith("screen")){if(m==="screenManagerBoard"&&!Ms()){console.warn("[NAV] blocked -> managerboard (no restaurant-bound access)"),K("screenPremiumApp");return}if(Ye(m==="screenPlay"||m==="screenPremiumApp"),K(m),m==="screenManagerBoard"){if(window.__BC_MB_DEFAULTTAB__=a.mbTab||"overview",await Ia?.(),wn?.(),!window.__BC_MB_LOADTAB__){await ae();return}a.mbTab?(window.__BC_MB_SHOWTAB__?.(a.mbTab),await window.__BC_MB_LOADTAB__?.(a.mbTab)):await window.__BC_MB_LOADTAB__?.(window.__BC_MB_DEFAULTTAB__)}return}}if(a.type==="drill_pick"){window.__BC_PARENT_LAST_ENCOUNTER__=a,console.log("[PARENT] drill_pick stored ✅",a);return}if(a.type==="hud_send_progress_feedback"){const p=a?.result||{},m=[document.getElementById("waiterSendProgressStatus"),document.getElementById("progressReportStatus")].filter(Boolean),g=u=>{m.forEach(f=>{f.textContent=u})};p?.ok?g("Progress sent ✅"):p?.error==="encounter_not_resolved"?g("Finish the encounter first, then send progress."):g(no(p?.error));return}}catch(a){console.error("[BC] parent bridge failed:",a);try{const i=String(r?.data?.type||"")==="event_log"?"event_log_ack":"error";r.source?.postMessage({source:"BC_MSG",v:1,type:i,ok:!1,error:String(a?.message||a)},r.origin)}catch{}}})}async function dd({userId:e,restaurantId:t}){if(!e||!t)return null;wc(e,t);const[n,r,a]=await Promise.all([I.from("bc_event_log").select("occurred_at,payload",{count:"exact"}).eq("restaurant_id",t).eq("user_id",e).eq("event_type","encounter_resolved").order("occurred_at",{ascending:!1}).limit(500),I.from("bc_readiness_v1").select("last10_count,last10_greens,last10_reds,session_any_red_t2plus").eq("user_id",e).eq("restaurant_id",t).maybeSingle(),I.from("bc_totals_v1").select("encounters_total,pivots_taken_total,pivots_success_total").eq("user_id",e).eq("restaurant_id",t).maybeSingle()]);n?.error&&console.warn("[BC] progression event-log snapshot query failed",n.error),r?.error&&console.warn("[BC] progression readiness snapshot query failed",r.error),a?.error&&console.warn("[BC] progression totals snapshot query failed",a.error);const s=Array.isArray(n?.data)?n.data:[],i=s.map(d=>bc(d)).filter(Boolean);if(i.length){const d=i.slice(0,10),p=r?.data||{},m=a?.data||{},g=Cs({encountersTotal:Number(n?.count??s.length??0)||Number(m?.encounters_total??0)||0,last10Count:d.length,last10Greens:d.filter(u=>u.isGreen).length,last10Reds:d.filter(u=>u.isRed).length,anyRedT2Plus:typeof p?.session_any_red_t2plus=="boolean"?p.session_any_red_t2plus:i.some(u=>u.tier>=2&&u.isRed),pivotsTaken:i.filter(u=>u.pivotTaken).length||Number(m?.pivots_taken_total??0)||0,pivotsSuccess:i.filter(u=>u.pivotSuccess).length||Number(m?.pivots_success_total??0)||0});if(g&&(g.encountersTotal>0||g.last10Count>0||g.pivotsTaken>0||g.pivotsSuccess>0))return g}const l=r?.data||{},c=a?.data||{},o=Cs({encountersTotal:Number(c?.encounters_total??0)||0,last10Count:Number(l?.last10_count??0)||0,last10Greens:Number(l?.last10_greens??0)||0,last10Reds:Number(l?.last10_reds??0)||0,anyRedT2Plus:!!l?.session_any_red_t2plus,pivotsTaken:Number(c?.pivots_taken_total??0)||0,pivotsSuccess:Number(c?.pivots_success_total??0)||0});return o&&(o.encountersTotal>0||o.last10Count>0||o.pivotsTaken>0||o.pivotsSuccess>0)?o:null}async function ud({userId:e,restaurantId:t,desiredTier:n=3}){const r=await dd({userId:e,restaurantId:t});if(r)return await ua({desiredTier:n===1?1:n===2?2:3,userId:e,restaurantId:t,snapshot:r});await Rr({userId:e,restaurantId:t});const a=Er(),s=Number(a?.selectors?.points?.()??NaN);return await ua({desiredTier:n===1?1:n===2?2:3,userId:e,restaurantId:t,pointsTotal:Number.isFinite(s)?s:null})}function nn(){return{seen:0,attempts:0,readCorrect:0,modeOptimal:0,modeNeutral:0,modeDamaging:0,hookOptimal:0,hookNeutral:0,hookDamaging:0,deliveryCorrect:0,clean:0,ok:0,shaky:0,break:0}}function md(){const e=Date.now();return{version:1,capturedAt:e,economy:{points:0,tier:1,encounterRange:[1,5],allowedGuestTypes:["dictator","bargain_smart","griever"],tones:["guide","charm","authority"],modes:["guide","charm","authority"]},session:{runId:0,runEase:1,runEaseRemaining:0,pressureLevel:0,finalDifficulty:1,currentEncounterId:1,mode:"guide",guestTypeSelected:"dictator"},authority:{tierToServe:1,encounterRange:[1,5],guestTypes:["dictator","bargain_smart","griever"]},display:{difficultySeed:1,effectiveDifficulty:1,pressureBand:"low"},run:{runId:0,scoredThisRun:{}},rewards:{encounters:{},drills:{},timedChallenges:{},premiumByEncounter:{},legacy:{}},rewardsSummary:{encounters:{count:0,totalPoints:0},drills:{count:0,totalPoints:0},timedChallenges:{count:0,totalPoints:0},premium:{count:0,totalPoints:0},legacy:{count:0,totalPoints:0}},mirror:{capturedAt:e,meta:{pointsTotal:0,encountersCleared:0,lastUpdatedMs:e,tierUnlocked:1,difficultySeed:1},axes:{control:0,selectivity:0,compression:0},counters:{dictatorGood:0,browserGood:0,analystGood:0},flags:{resetDebt:0},unlocks:{authorityMode:!1,compressedQuestions:!1,powerMovePivot:!1,explorationSafeHooks:!1,singleVariableHooks:!1,fancy:!1,celebrator:!1,guestFancy:!1,guestCelebrator:!1},drift:{vec:0,ttl:0},recovery:{type:null,step:0,ttl:0},guestRanks:{dictator:nn(),bargain_smart:nn(),griever:nn(),fancy:nn(),celebrator:nn()}}}}async function gd(e,{userId:t,restaurantId:n,scopeId:r=null}){const a={user_id:t,restaurant_id:n,scope_id:r||n,canonical_state:md(),source_type:"hard_reset_progression",updated_at:new Date().toISOString()},{error:s}=await e.from("bc_progression_state_v1").upsert(a,{onConflict:"user_id,restaurant_id"});if(s)throw s}async function pd(e,{userId:t,restaurantId:n}){const{error:r}=await e.from("bc_skill_snapshots_v1").delete().eq("user_id",t).eq("restaurant_id",n);if(r)throw r}async function _d({userId:e,restaurantId:t}){try{At({user_id:e,restaurant_id:t,source:{reason:"hard_reset_progression_option_a"}})}catch{}await Rr({userId:e,restaurantId:t});try{await window.__BC_GET_PROGRESSION_SNAPSHOT__?.({forceRefresh:!0,userId:e,restaurantId:t})}catch(r){console.warn("[BC hard reset] snapshot refresh failed",r)}const n=yi(e,t);try{localStorage.removeItem(n)}catch{}}async function Yi({userId:e,restaurantId:t,scopeId:n=null,refreshParentView:r=!0}={}){if(!e||!t)throw new Error("missing_reset_target");const a=window.supabase||window.__BC_SUPABASE__||I;if(!a)throw new Error("missing_supabase_client");const s=qc({userId:e,restaurantId:t});try{return await gd(a,{userId:e,restaurantId:t,scopeId:n}),await pd(a,{userId:e,restaurantId:t}),await _d({userId:e,restaurantId:t}),r&&await Fa?.(),{ok:!0,userId:e,restaurantId:t,resetMode:"progression_only",resetMarkerKey:s?.resetMarkerKey||null}}catch(i){try{s?.resetMarkerKey&&localStorage.removeItem(s.resetMarkerKey)}catch{}throw i}}function fd(){window.__BC_MB_PERFORMANCE_MODEL__=null,window.__BC_MB_SELECTION_MODEL__=null}function zi(e,t,n){return e&&String(e.restaurantId||"")===String(n||"")&&Date.now()-Number(e.loadedAt||0)<Number(t)}function yd(){const e=document.querySelector("#mbPanels .mbTab:not(.hidden)"),t=String(e?.id||"");return t.startsWith("mbTab_")?mt(t.slice(6)):"overview"}async function hd(){fd();const e=yd();if(e==="performance"){await kr(),await Ao();const t=document.getElementById("mbHistoryUser");t?.value&&await Aa(t.value);return}if(e==="selection"){await Ea();return}await ft(),Cn?.(),O("renderManagerBoardOverviewRitualStatusCard",()=>_r?.())}async function wd({userId:e,restaurantId:t=null}={}){const n=ue("premium"),r=n.profile||null,a=F(r);if(!["single_manager","group_manager","enterpriser"].includes(a))throw new Error("forbidden_role");const s=j?.()||n.activeRestaurantId||r?.restaurant_id||null,i=t||s||null;if(!e||!i)throw new Error("missing_reset_target");if(s&&String(i)!==String(s))throw new Error("forbidden_target_restaurant");let l=(window.__BC_MB_STAFF_ROWS__||[]).find(p=>String(p?.user_id||"")===String(e))||null;if(!l){const{data:p,error:m}=await I.from("profiles").select("user_id, restaurant_id, role").eq("user_id",e).eq("restaurant_id",i).maybeSingle();if(m)throw m;l=p||null}if(!l)throw new Error("target_not_found");if(F(l)!=="waiter")throw new Error("target_not_waiter");const c=jt(),o=c?.userId||r?.user_id||n.session?.user?.id||null,d=c?.restaurantId||s||i;try{return await Yi({userId:e,restaurantId:i,scopeId:r?.scope_id||i,refreshParentView:!1})}finally{At({user_id:o,restaurant_id:d,source:{reason:"manager_progression_reset_restore"}}),await hd()}}window.__BC_GET_PROGRESSION_SNAPSHOT__=async function(e={}){const t=_.session||null,n=_.profile||null,r=t?.user?.id||null,a=jt(),s=Da({targetUserId:e?.targetUserId||a.userId||null,waiterUserId:e?.waiterUserId,receiver_user_id:e?.receiver_user_id,activeProfile:e?.activeProfile||null,profile:e?.activeProfile||e?.profile||n||null,membership:e?.membership||null,restaurantId:e?.restaurantId||e?.activeProfile?.restaurant_id||e?.membership?.restaurant_id||a.restaurantId||n?.restaurant_id||null},t),i=Oa({restaurantId:e?.restaurantId||e?.activeProfile?.restaurant_id||e?.membership?.restaurant_id||a.restaurantId||n?.restaurant_id||null,activeProfile:e?.activeProfile||null,profile:e?.activeProfile||e?.profile||n||null,membership:e?.membership||null});if(console.log("[BC snapshot target]",{authUserId:r,authProfileUserId:n?.user_id||null,progressionOwnerUserId:s,progressionOwnerRestaurantId:i,ownerCtx:a,opts:e}),!r)return console.warn("[BC snapshot] blocked: no auth user"),null;if(!s||!i)return console.warn("[BC snapshot] blocked: missing progression owner identity",{authUserId:r,progressionOwnerUserId:s,progressionOwnerRestaurantId:i,ownerCtx:a}),null;At({user_id:s,restaurant_id:i});const{data:l,error:c}=await I.from("bc_progression_state_v1").select("*").eq("user_id",s).eq("restaurant_id",i).maybeSingle();return console.log("[BC snapshot result]",{authUserId:r,progressionOwnerUserId:s,progressionOwnerRestaurantId:i,found:!!l,error:c?.message||null}),c?(console.warn("[BC snapshot] fetch failed",c),null):l||null};function K(e){document.querySelectorAll(".screen").forEach(r=>r.classList.add("hidden"));const n=document.getElementById(e);n?n.classList.remove("hidden"):(console.error("[NAV] showScreen missing:",e,"-> falling back to screenHome"),document.getElementById("screenHome")?.classList.remove("hidden"),e="screenHome"),Qi(),_a(),bd(e);try{al()}catch{}try{On()}catch{}try{Va?.()}catch{}e==="screenHome"&&(ja?.(),document.getElementById("btnHomeLogout")?.classList.add("hidden"),document.getElementById("btnHomeExitPremium")?.classList.add("hidden"));try{Ze?.()}catch{}}function Ze(){const e=document.getElementById("appChromeSurface"),t=document.getElementById("appChromeRole"),n=document.getElementById("appChromeRestaurant"),r=document.getElementById("appChromeStatus");if(!e&&!t&&!n&&!r)return;const a=Array.from(document.querySelectorAll(".screen:not(.hidden)")),s=!document.getElementById("screenProfile")?.classList.contains("hidden"),l=!document.getElementById("screenWaiterLeaderboard")?.classList.contains("hidden")?"screenWaiterLeaderboard":s?"screenProfile":a[0]?.id||"screenHome",c={screenHome:"Lobby",screenCreateRestaurant:"Restaurant Setup",screenPremiumApp:"Premium Floor",screenProfile:"Profile",screenWaiterLeaderboard:"Leaderboard",screenSetupPremium:"Wine Setup",screenManagerBoard:"Manager Board",screenGameDemo:"Demo Floor"},o=_?.profile||{},d=_?.restaurant||{},p=rt?.(o)||"Guest",m=d?.name||d?.id||"Not bound",u=!!_?.session?.user?(o?.access_tier||o?.accessTier||"premium").toString().toUpperCase():"Public Access";e&&(e.textContent=c[l]||"Workspace"),t&&(t.textContent=p),n&&(n.textContent=m),r&&(r.textContent=u)}function Qi(){["btnResetAll","btnResetRuns","btnResetProgress","btnResetWines","btnResetRunsPremium","btnResetProgressPremium","btnResetWinesPremium","btnResetRunsDemo","btnResetProgressDemo","btnResetWinesDemo"].forEach(t=>document.getElementById(t)?.remove()),document.querySelectorAll("button").forEach(t=>{(t.textContent||"").trim().toLowerCase().includes("reset")&&t.remove()})}function bd(e){console.log("[NAV] parent onScreenChanged ->",e);const n=String(_?.profile?.role||"").toLowerCase()==="waiter",r=e==="screenPremiumApp"||e==="screenPlay";if(r&&!_?.session){console.warn("[NAV] blocked premium mount: no session"),K("screenHome");return}Ye(r),r&&(document.getElementById("premiumRootFrame")||Wt({showBack:!0,backTo:n?"screenPremiumApp":"screenManagerBoard"})),r||document.getElementById("hudPanel")?.classList.add("hidden"),e==="screenHome"&&ja(),Qi()}function vd(e){if(!e||e.type!=="nav"&&e.type!=="nav_back"||e.type==="nav_back")return!1;window.__BC_LAST_NAV_AT__=window.__BC_LAST_NAV_AT__||0;const t=Date.now();return t-window.__BC_LAST_NAV_AT__<250?!0:(window.__BC_LAST_NAV_AT__=t,!1)}const Us={waiter:{nav:{home:!0,play:!0,progress:!0,skills:!0,messages:!0,restaurant:!1,restaurants:!1,waiterInvites:!1,managerBoard:!1,groupBoard:!1,enterpriseBoard:!1,influenceMap:!1,intuit:!1,profile:!0},powers:{canJoinByCode:!0,canInviteWaiters:!1,canUninviteWaiters:!1,canManageRestaurant:!1,canManageMultipleRestaurants:!1,canOpenRestaurants:!1,canUseInfluenceMap:!1,canUseIntuit:!1}},single_manager:{nav:{home:!0,play:!0,progress:!0,skills:!0,messages:!0,restaurant:!0,restaurants:!1,waiterInvites:!0,managerBoard:!0,groupBoard:!1,enterpriseBoard:!1,influenceMap:!1,intuit:!1,profile:!0},powers:{canJoinByCode:!1,canInviteWaiters:!0,canUninviteWaiters:!0,canManageRestaurant:!0,canManageMultipleRestaurants:!1,canOpenRestaurants:!0,canUseInfluenceMap:!1,canUseIntuit:!1}},group_manager:{nav:{home:!0,play:!0,progress:!0,skills:!0,messages:!0,restaurant:!0,restaurants:!0,waiterInvites:!0,managerBoard:!0,groupBoard:!0,enterpriseBoard:!1,influenceMap:!0,intuit:!1,profile:!0},powers:{canJoinByCode:!1,canInviteWaiters:!0,canUninviteWaiters:!0,canManageRestaurant:!0,canManageMultipleRestaurants:!0,canOpenRestaurants:!0,canUseInfluenceMap:!0,canUseIntuit:!1}},enterpriser:{nav:{home:!0,play:!0,progress:!0,skills:!0,messages:!0,restaurant:!0,restaurants:!0,waiterInvites:!0,managerBoard:!0,groupBoard:!0,enterpriseBoard:!0,influenceMap:!0,intuit:!0,profile:!0},powers:{canJoinByCode:!1,canInviteWaiters:!0,canUninviteWaiters:!0,canManageRestaurant:!0,canManageMultipleRestaurants:!0,canOpenRestaurants:!0,canUseInfluenceMap:!0,canUseIntuit:!0}}};function Ar(e){return Us[e]||Us.waiter}function te(e,t){const n=document.getElementById(e);n&&(n.hidden=!t)}function Sd(e){const t=Ar(e).nav;te("navHome",t.home),te("navPlay",t.play),te("navProgress",t.progress),te("navSkills",t.skills),te("navMessages",t.messages),te("navRestaurant",t.restaurant),te("navRestaurants",t.restaurants),te("navWaiterInvites",t.waiterInvites),te("navManagerBoard",t.managerBoard),te("navGroupBoard",t.groupBoard),te("navEnterpriseBoard",t.enterpriseBoard),te("navInfluenceMap",t.influenceMap),te("navIntuit",t.intuit),te("navProfile",t.profile)}function Ed(e){const t=Ar(e).powers;te("btnInviteWaiter",t.canInviteWaiters),te("btnUninviteWaiter",t.canUninviteWaiters),te("btnOpenRestaurant",t.canOpenRestaurants),te("btnInfluenceMap",t.canUseInfluenceMap),te("btnIntuit",t.canUseIntuit)}function Rd(e,t){return!!Ar(e).powers[t]}function _a(){if(oe())return;const e=F(_?.profile||null)||"waiter",t=Ar(e);Sd(e),Ed(e),window.__BC_UI_GATES__=t,window.__BC_ROLE__=e,window.requirePower=Rd,["btnPremiumWineSetup","btnTutorial","btnWineSetup","btnGoSetup","btnSetupWines","btnOpenSetup","btnGoSetupPremium","btnContinuePremium","btnBackHomeFromSetupPremium"].forEach(r=>{const a=document.getElementById(r);a&&(a.style.display=t.powers.canManageRestaurant?"":"none")}),document.querySelectorAll('[data-nav="screenSetupPremium"]').forEach(r=>{r.style.display=t.powers.canManageRestaurant?"":"none",r.style.pointerEvents=t.powers.canManageRestaurant?"":"none"})}function G(e,t,n="normal"){const r=document.getElementById(e);r&&(r.textContent=t||"",r.classList.remove("successText","errorText"),n==="success"&&r.classList.add("successText"),n==="error"&&r.classList.add("errorText"))}function xe(){G("authMsg",""),G("createRestMsg",""),G("inviteMsg",""),G("hudMsg",""),G("demoJoinMsg","")}function Id(){return _.progressionView||{level:"Building recognition",focus:"Reading guest intent",next:"Keep playing encounters",note:null}}function $t(){const e=Id(),t=document.getElementById("bcProgLevelParent"),n=document.getElementById("bcProgFocusParent"),r=document.getElementById("bcProgNextParent"),a=document.getElementById("bcProgNoteParent");!t||!r||!a||(t.textContent=e.level||"",n&&(n.textContent=e.focus||""),r.textContent=e.next||"",e.note?(a.textContent=e.note,a.style.display="block"):(a.textContent="",a.style.display="none"))}window.refreshParentProgressionUI=$t;function Cd(e){return Number(e||1)<2?{level:"Building recognition",focus:"Reading guest intent",next:"Keep playing encounters",note:"Progress updates after a few sessions"}:{level:"Developing confidence",focus:"Staying steady under pushback",next:"Stay consistent across a few sessions",note:null}}function Ji(e,t){return`bc_seen_unlock_t2__${e}__${t}`}function Td(e,t){try{return localStorage.getItem(Ji(e,t))==="1"}catch{return!1}}function Ad(e,t){try{localStorage.setItem(Ji(e,t),"1")}catch{}}function Bd(){const e=document.getElementById("bcUnlockNotice");e&&(e.innerText=`You’re ready to manage pressure, not just read it.

From here on, guests will push back.
Your job is to stay calm, adjust, and keep control.`,e.style.display="block",ta&&clearTimeout(ta),ta=setTimeout(()=>{e.style.display="none",e.innerText=""},6500))}function Md(){const e=document.getElementById("bcUnlockNotice");e&&(e.style.display="none",e.innerText="")}let ra=!1;async function Fa(){if(!ra){ra=!0;try{const e=ue("premium"),t=e.session||null,n=e.profile||null,r=jt(),a=Da({targetUserId:r.userId||null,restaurantId:r.restaurantId||e.activeRestaurantId||n?.restaurant_id||null,profile:n},t),s=Oa({restaurantId:r.restaurantId||e.activeRestaurantId||n?.restaurant_id||null,profile:n});if(!a||!s){_.progressionView={level:"Building recognition",focus:"Reading guest intent",next:"Keep playing encounters",note:"Progress updates after a few sessions"},$t();return}const i=2;await Rr({userId:a,restaurantId:s});const l=Er(),c=Number(l?.selectors?.points?.()??NaN),d=(await ua({desiredTier:i,userId:a,restaurantId:s,pointsTotal:Number.isFinite(c)?c:null,role:n?.role,mode:"premium"}))?.tierToServe??1;_.progressionView=Cd(d);const p=_._lastAllowedTier||1;_._lastAllowedTier=d,p<2&&d>=2&&!Td(a,s)&&(Bd(),Ad(a,s)),d<2&&Md(),$t()}catch{_.progressionView={level:"Building recognition",focus:"Reading guest intent",next:"Keep playing encounters",note:"Progress updates after a few sessions"},$t()}finally{ra=!1}}}function Z(e,t,n="operation"){let r;const a=new Promise((s,i)=>{r=setTimeout(()=>i(new Error(`${n} timed out after ${t}ms`)),t)});return Promise.race([e,a]).finally(()=>clearTimeout(r))}function qa(e){return(e||"").trim().toLowerCase()}function ur(e){return(e||"").trim().toUpperCase()}function _n(){return document.getElementById("premiumRootFrame")?.contentWindow||null}function xd(){const e=document.getElementById("premiumRootFrame");if(!e)return null;const t=Number(window.__BC_IFRAME_EPOCH__||0),n=Number(e.dataset?.bcEpoch||0);return t&&n&&n!==t?(console.warn("[PARENT] getPremiumFrame blocked (epoch mismatch)",{frameEpoch:n,currentEpoch:t}),null):e}function mr(e,t={}){try{if(oe?.()||xt?.()||!window.appState?.session)return!1}catch{}const r=xd()?.contentWindow;if(!r)return!1;const a=typeof e=="string"?{source:"BC_MSG",v:1,type:e,...t}:{source:"BC_MSG",v:1,...e||{}};return r.postMessage(a,window.location.origin),!0}async function ar(e){const{data:t,error:n}=await I.from("bc_wines").select("*").eq("restaurant_id",e).order("created_at",{ascending:!0});if(n)throw n;return cr(t||[])}async function Ld(e,t){const{data:n,error:r}=await I.auth.getUser();if(r)throw r;const a=n?.user?.id;if(!a)throw new Error("not_authenticated");const s={restaurant_id:e,created_by:a,name:t.name,varietal:t.varietal,fruit_tags:t.fruit_tags,texture_tags:t.texture_tags,oak_level:t.oak_level,process:t.process||"",region:t.region||"",story:t.story||""},{error:i}=await I.from("bc_wines").insert(s);if(i)throw i}async function kd(e){const{error:t}=await I.from("bc_wines").delete().eq("id",e);if(t)throw t}async function Xi(){try{await Ka?.(),await ji?.()}catch(u){console.warn("[BC] setup restaurant context resolve failed",u)}K("screenSetupPremium");const e=document.getElementById("btnBackHomeFromSetupPremium");e&&!e.__bcBound&&(e.__bcBound=!0,e.addEventListener("click",()=>{K("screenPremiumApp")}));const t=document.getElementById("btnContinuePremium");t&&!t.__bcBound&&(t.__bcBound=!0,t.addEventListener("click",()=>{K("screenPremiumApp")}));const n=j()||Vi();if(!n){try{const f=(await Ut()||[]).map(dt);ee("",f),pa(f.length),Nt(f.slice(0,ut))}catch(u){console.warn("[BC] fallback wine load failed",u);const f=$e();pa(f.length),Nt(f.slice(0,ut))}return}let r=[],a=[],s="";const i=document.getElementById("premiumWineAdvanced");i&&(i.open=window.innerWidth>860),Zn("fruitOptionsPremium",Ps,2,()=>r,u=>r=u),Zn("textureOptionsPremium",Ds,2,()=>a,u=>a=u),$s("oakOptionsPremium",Os,()=>s,u=>s=u);const l=$e(n).map(dt);l.length&&Nt(l.slice(0,ut));let c=l;try{const f=(await ar(n)||[]).map(dt);if(f.length)c=f;else{const h=(await Ut()).map(dt);h.length&&(c=h)}}catch(u){console.warn("[BC] fetch wines for setup failed; falling back to cache",u);try{const f=(await Ut()).map(dt);f.length&&(c=f)}catch(f){console.warn("[BC] accessible wine fallback failed",f)}}(c.length||!l.length)&&ee(n,c),Nt(c.slice(0,ut));const o=document.getElementById("wineCountPremium");o&&(o.textContent=`${Array.isArray(c)?c.length:0} / 10`);const d=document.getElementById("addWineBtnPremium");d&&!d.__bcBound&&(d.__bcBound=!0,d.addEventListener("click",async()=>{const u=(document.getElementById("wineNameInputPremium")?.value||"").trim(),f=(document.getElementById("wineVarietalInputPremium")?.value||"").trim(),h=(document.getElementById("processInputPremium")?.value||"").trim(),w=(document.getElementById("regionInputPremium")?.value||"").trim(),S=(document.getElementById("storyInputPremium")?.value||"").trim();if(!u||!f||r.length===0||a.length===0||!s){alert("Please complete required fields and select fruit, texture, and oak.");return}try{await Ld(n,{name:u,varietal:f,fruit_tags:r,texture_tags:a,oak_level:s,process:h,region:w,story:S}),document.getElementById("wineNameInputPremium").value="",document.getElementById("wineVarietalInputPremium").value="",document.getElementById("processInputPremium").value="",document.getElementById("regionInputPremium").value="",document.getElementById("storyInputPremium").value="",r=[],a=[],s="",Zn("fruitOptionsPremium",Ps,2,()=>r,B=>r=B),Zn("textureOptionsPremium",Ds,2,()=>a,B=>a=B),$s("oakOptionsPremium",Os,()=>s,B=>s=B);const b=(await ar(n)||[]).map(dt);ee(n,b),Nt(b.slice(0,ut))}catch(E){console.error("[BC] add wine failed",E),alert("Failed to save wine.")}}));const p=document.getElementById("premiumWineTableBody"),m=document.getElementById("premiumWineCards"),g=u=>{!u||u.__bcBound||(u.__bcBound=!0,u.addEventListener("click",async f=>{const w=f.target?.closest?.("[data-wine-del]")?.getAttribute?.("data-wine-del");if(w&&confirm("Delete this wine?"))try{await kd(w);const E=(await ar(n)||[]).map(dt);ee(n,E),Nt(E.slice(0,ut))}catch(S){console.error("[BC] delete wine failed",S),alert("Failed to delete wine.")}}))};g(p),g(m)}function fa(){const e=document.getElementById("btnManagerBoard"),t=document.getElementById("btnOpenProfile"),n=document.getElementById("btnOpenMessages"),r=document.getElementById("btnPremiumWineSetup"),a=document.getElementById("btnTutorial");e&&!e.__bcBound&&(e.__bcBound=!0,e.addEventListener("click",()=>{J(_?.profile).canAccessManagerBoard&&qr?.("nav_button")})),t&&!t.__bcBound&&(t.__bcBound=!0,t.addEventListener("click",async()=>{await be?.("openProfile"),Go(),Wd(),Ka?.()})),n&&!n.__bcBound&&(n.__bcBound=!0,n.addEventListener("click",()=>{le?.(),Hd()})),r&&!r.__bcBound&&(r.__bcBound=!0,r.addEventListener("click",async()=>{await Xi()})),a&&!a.__bcBound&&(a.__bcBound=!0,a.addEventListener("click",()=>{Cc()}))}function fn(e){const t=document.getElementById("homeAuthBadge"),n=document.getElementById("btnHomeLogout");e?(t?.classList.remove("hidden"),n?.classList.remove("hidden")):(t?.classList.add("hidden"),n?.classList.add("hidden"));try{Ze?.()}catch{}}function ja(){["btnHomeLogout","btnLogoutCreate","btnLogoutPremium","btnLogoutManagerBoard","btnLogout","btnDemoExit","btnDemoPremium"].forEach(t=>{const n=document.getElementById(t);n&&n.classList.add("hidden")})}function Nd(){document.getElementById("authFields")&&(document.getElementById("btnDemoExit")?.classList.add("hidden"),document.getElementById("btnDemoPremium")?.classList.add("hidden"))}function On(){const e=!!_?.session;fn(e),document.getElementById("authFields")?.classList.toggle("hidden",e);const n=document.getElementById("btnHomeExitPremium");e||n?.classList.add("hidden"),["btnHomeLogout","btnLogoutCreate","btnLogoutPremium","btnLogoutManagerBoard"].forEach(r=>{const a=document.getElementById(r);a&&(a.classList.toggle("hidden",!e),e||(a.disabled=!1,a.style.pointerEvents="",a.style.opacity=""))}),e||document.querySelectorAll("[data-role]").forEach(r=>r.classList.add("hidden"))}async function Va(){try{On();const e=!!_.session;console.log("[UI] syncAuthUi",{authed:e})}catch(e){console.warn("[UI] syncAuthUi failed",e)}}function Zi(){try{On()}catch{}document.querySelectorAll("button").forEach(e=>{const t=(e.textContent||"").toLowerCase(),n=(e.id||"").toLowerCase();(t.includes("logout")||t.includes("sign out")||n.includes("logout"))&&(e.classList.add("hidden"),e.disabled=!1,e.onclick=null)}),document.getElementById("authFields")?.classList.remove("hidden"),document.getElementById("homeAuthBadge")?.classList.add("hidden")}function eo(e){const t=String(e?.role||"").toLowerCase(),n=e?.restaurant_id??null,r=!!e?.is_first50,a=e?.premium_pass_expires_at?new Date(e.premium_pass_expires_at):null,s=a&&!isNaN(a.getTime())&&a.getTime()>Date.now();return t!=="waiter"&&!Ue(t)?{ok:!1,reason:"invalid_role"}:n?{ok:!0,reason:"entitled.restaurant"}:r?{ok:!0,reason:"entitled.first50"}:s?{ok:!0,reason:"entitled.pass30"}:{ok:!1,reason:"no_entitlement"}}function Ge(e){ze=e==="premium"?"premium":"login";const t=document.querySelector("#screenHome .title"),n=document.querySelector("#screenHome .subtle"),r=document.getElementById("btnHomePremium"),a=document.getElementById("btnHomeExitPremium");ze==="premium"?(t&&(t.textContent="Premium Login"),n&&(n.textContent="Login, then enter your Premium code (or contact us to purchase)."),r&&(r.textContent="Premium ✓"),a&&a.classList.remove("hidden")):(t&&(t.textContent="Join Game"),n&&(n.textContent="Use the parent login first, then enter Premium to configure the restaurant or join with your issued access."),r&&(r.textContent="Premium"),a&&a.classList.add("hidden")),Wr()}function Pd(){ro(!0),mo?.(),go?.();const e=_?.profile||{};J(e).canManageMultipleRestaurants&&vo?.(),mu?.(),Tt()}function le(){ro(!1)}function Dd(e,t,n){const r=String(e?.sender_user_id||"")===String(t||""),a=De(e?.sender_user_id,n),s=String(e?.type||"message"),i=y(String(e?.body||"")),l=y(String(e?.created_at||""));let c="MSG";s==="progress_report"&&(c="REPORT"),s==="instruction"&&(c="INSTRUCTION"),s==="drill_override"&&(c="DRILL"),s==="drill_completed"&&(c="DONE"),s==="drill_effectiveness"&&(c="IMPACT");let o="";const d=s!=="drill_override",p=String(_?.profile?.role||"").toLowerCase()==="waiter";if(s==="drill_override"&&e?.payload?.drill){const m=e.payload.drill||{},g=Array.isArray(m.pool)?m.pool.join(", "):"-",u=y(String(m.focus||"-")),f=y(String(m.repTarget??"-")),h=y(String(m.durationSec??"-")),w=y(String(m.tier??"-")),S=y(String(e?.payload?.reason||"")),E=p?`
        <button
          type="button"
          class="btn-ghost waiterStartAssignedDrill"
          data-drill-message-id="${y(String(e.id||""))}"
          style="margin-top:10px;"
        >
          Start Assigned Drill
        </button>
    `:"";o=`
      <div style="
        margin-top:8px;
        padding:10px;
        border:1px solid rgba(255,255,255,0.10);
        border-radius:10px;
        background:rgba(255,255,255,0.04);
      ">
        <div><strong>Assigned drill</strong></div>
        <div class="small-text" style="margin-top:6px; opacity:.9;">Focus: ${u}</div>
        <div class="small-text" style="opacity:.9;">Pool: ${y(g)}</div>
        <div class="small-text" style="opacity:.9;">Reps: ${f}</div>
        <div class="small-text" style="opacity:.9;">Duration: ${h}s</div>
        <div class="small-text" style="opacity:.9;">Tier: ${w}</div>
        ${S?`<div class="small-text" style="margin-top:8px; opacity:.75;">${S}</div>`:""}
        ${E}
      </div>
    `}else if(s==="drill_completed"){const m=e.payload||{},g=y(String(m.focus||"-")),u=y(String(m.repsDone??"-")),f=y(String(m.repTarget??"-")),h=Number(m.durationSec??0),w=h?Math.floor(h/60):0,S=h?h%60:0,E=h?`${w}m ${S}s`:"-";o=`
      <div style="
        margin-top:8px;
        padding:10px;
        border:1px solid rgba(255,255,255,0.10);
        border-radius:10px;
        background:rgba(255,255,255,0.04);
      ">
        <div><strong>Drill completed</strong></div>
        <div class="small-text" style="margin-top:6px; opacity:.9;">Focus: ${g}</div>
        <div class="small-text" style="opacity:.9;">Reps: ${u} / ${f}</div>
        <div class="small-text" style="opacity:.9;">Time: ${y(E)}</div>
      </div>
    `}else if(s==="drill_effectiveness"){const m=e.payload||{},g=y(String(m.focus||"-")),u=Number(m.delta??0),f=y(String(m.skillKey||"-")),h=u>0?`+${u}%`:`${u}%`;o=`
      <div style="
        margin-top:8px;
        padding:10px;
        border:1px solid rgba(255,255,255,0.10);
        border-radius:10px;
        background:rgba(255,255,255,0.04);
      ">
        <div><strong>Drill effectiveness</strong></div>
        <div class="small-text" style="margin-top:6px; opacity:.9;">Focus: ${g}</div>
        <div class="small-text" style="opacity:.9;">Skill: ${f}</div>
        <div class="small-text" style="opacity:.9;">Change: ${y(h)}</div>
        <div class="small-text" style="margin-top:8px; opacity:.75;">${y(String(e.body||""))}</div>
      </div>
    `}else if(s==="progress_report"){const m=fe(e)||{};if(Object.keys(m).length){const g=m.skills||{};o=`
<div style="
  margin-top:8px;
  padding:10px;
  border:1px solid rgba(255,255,255,0.10);
  border-radius:10px;
  background:rgba(255,255,255,0.04);
">

<div><strong>Progress snapshot</strong></div>

<div class="small-text" style="margin-top:6px;">
Encounter: ${y(String(m.encounterNumber??"-"))}
</div>

<div class="small-text">
Guest: ${y(String(m.guestStateActual??"-"))}
</div>

<div class="small-text">
Difficulty: ${y(String(m.difficulty??"-"))}
</div>

<div class="small-text">
Signal: ${y(String(m.chainSignal??"-"))}
</div>

<div class="small-text">
Score: ${y(String(m.chainScore??"-"))}
</div>

<hr style="opacity:.2; margin:8px 0;">

<div><strong>Skill Tree</strong></div>

<div class="small-text">Guest Reading: ${g.read??0}%</div>
<div class="small-text">Framing: ${g.framing??0}%</div>
<div class="small-text">Delivery: ${g.delivery??0}%</div>
<div class="small-text">Recovery: ${g.recovery??0}%</div>
<div class="small-text">Closing: ${g.closing??0}%</div>

<div class="small-text" style="margin-top:8px; opacity:.75;">
Strongest: ${y(String(m.strongestSkill??"-"))}
</div>

<div class="small-text" style="opacity:.75;">
Needs Work: ${y(String(m.weakestSkill??"-"))}
</div>

</div>
`}}return`
    <div style="
      align-self:${r?"flex-end":"flex-start"};
      max-width:88%;
      background:${r?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.10)"};
      border:1px solid rgba(255,255,255,0.10);
      border-radius:12px;
      padding:10px;
    ">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="badge">${c}</span>
          <b>${y(a)}</b>
        </div>
        <div class="small-text" style="opacity:.6;">${l}</div>
      </div>
      ${d?`<div style="margin-top:8px; white-space:pre-wrap;">${i}</div>`:""}
      ${o}
    </div>
  `}function Od(e={}){const t=String(e?.type||"").toLowerCase();return t?t==="progress_report"?"template:progress_report":t==="instruction"?"template:instruction":t==="drill_override"?"template:drill_override":t==="drill_completed"?"template:drill_completed":t==="drill_effectiveness"?"template:drill_effectiveness":`row:${String(e?.id||"")}`:`row:${String(e?.id||"")}`}function $d(e=[]){const t=Array.isArray(e)?e:[],n=new Map;for(const r of t){const a=Od(r),s=n.get(a);if(!s){n.set(a,r);continue}const i=new Date(r?.created_at||0).getTime(),l=new Date(s?.created_at||0).getTime();i>=l&&n.set(a,r)}return Array.from(n.values()).sort((r,a)=>new Date(r?.created_at||0)-new Date(a?.created_at||0))}async function to(){const e=document.getElementById("waiterMessagesThread");if(!e)return;const t=window.getActiveRestaurantId?.()||_?.profile?.restaurant_id||null,n=_?.session?.user?.id||_?.session?.userId||null;if(!t||!n){e.innerHTML='<div class="small-text" style="opacity:.8;">Messages not ready.</div>';return}e.innerHTML='<div class="small-text" style="opacity:.8;">Loading…</div>';const{data:r,error:a}=await I.from("bc_messages_v1").select("id, created_at, scope_type, scope_id, restaurant_id, sender_user_id, receiver_user_id, sender_role, type, body, payload, read_at").eq("restaurant_id",t).or(`sender_user_id.eq.${n},receiver_user_id.eq.${n}`).is("archived_at",null).order("created_at",{ascending:!1}).limit(100);if(a){console.error("[WAITER MSG] load failed",a),e.innerHTML='<div class="small-text" style="opacity:.8;">Failed to load messages.</div>';return}const s=r||[];if(!s.length){e.innerHTML='<div class="small-text" style="opacity:.8;">No messages yet.</div>';return}const i=Array.from(new Set(s.flatMap(o=>[o.sender_user_id,o.receiver_user_id]).filter(Boolean))),l=await se(i),c=$d(s);e.innerHTML=c.map(o=>Dd(o,n,l)).join(""),e.scrollTop=0,Ud()}function Ud(){document.querySelectorAll(".waiterStartAssignedDrill").forEach(e=>{e.__wired||(e.__wired=!0,e.addEventListener("click",async()=>{try{const t=String(e.getAttribute("data-drill-message-id")||"");if(!t)return;const n=window.getActiveRestaurantId?.()||_?.profile?.restaurant_id||null,r=_?.session?.user?.id||_?.session?.userId||null;if(!n||!r)return;const{data:a,error:s}=await I.from("bc_messages_v1").select("id, payload, type").eq("id",t).eq("restaurant_id",n).or(`sender_user_id.eq.${r},receiver_user_id.eq.${r}`).limit(1).maybeSingle();if(s||!a||String(a.type)!=="drill_override"){console.warn("[WAITER] failed to load drill message",s||"not_found");return}const i=a?.payload?.drill||null;if(!i)return;const l=document.getElementById("premiumRootFrame");if(!l||!l.contentWindow)return;l.contentWindow.postMessage({source:"BC_MSG",v:1,type:"launch_assigned_drill_request",assignedMessageId:t,drill:i},window.location.origin);const c=document.getElementById("waiterSendProgressStatus");c&&(c.textContent="Starting assigned drill…")}catch(t){console.warn("[WAITER] start assigned drill failed",t)}}))})}async function Hd(){const e=document.getElementById("waiterMessagesPanel");if(e&&!e.classList.contains("hidden")){on();return}_?.profile&&At({user_id:_.profile.user_id||null,restaurant_id:_.profile.restaurant_id||null}),document.getElementById("waiterMessagesBackdrop")?.classList.add("hidden"),e?.classList.remove("hidden"),document.getElementById("btnOpenMessages")?.setAttribute("aria-expanded","true");const t=document.getElementById("waiterSendProgressStatus");t&&(t.textContent=""),Gd();try{await to()}catch(n){console.error("[WAITER MSG] open failed",n)}}function on(){document.getElementById("waiterMessagesBackdrop")?.classList.add("hidden"),document.getElementById("waiterMessagesPanel")?.classList.add("hidden"),document.getElementById("btnOpenMessages")?.setAttribute("aria-expanded","false");const e=document.getElementById("waiterSendProgressStatus");e&&(e.textContent="")}function Gd(){const e=_?.profile||{},t=F(e),r=pi(e).some(c=>["manager","single_manager","group_manager","enterprise_admin","enterpriser"].includes(c)),a=t==="waiter"&&!r,s=document.getElementById("btnWaiterSendProgress"),i=document.getElementById("waiterSendProgressStatus"),l=s?.parentElement||null;l&&(l.classList.toggle("hidden",!a),l.style.display=a?"":"none"),!a&&i&&(i.textContent="")}function ya(){const e=document.getElementById("btnCloseMessages"),t=document.getElementById("waiterMessagesBackdrop"),n=document.getElementById("btnWaiterSendProgress"),r=document.getElementById("btnOpenMessages"),a=document.getElementById("waiterMessagesPanel");e&&!e.__bcBound&&(e.__bcBound=!0,e.addEventListener("click",on)),t&&!t.__bcBound&&(t.__bcBound=!0,t.addEventListener("click",on)),document.body&&!document.body.__bcWaiterInboxBound&&(document.body.__bcWaiterInboxBound=!0,document.addEventListener("click",s=>{const i=s.target;if(!i)return;const l=document.getElementById("waiterMessagesPanel");if(!l||l.classList.contains("hidden"))return;const c=document.getElementById("btnOpenMessages");l.contains(i)||c?.contains(i)||on()})),r&&r.setAttribute("aria-expanded",a?.classList.contains("hidden")?"false":"true"),n&&!n.__bcBound&&(n.__bcBound=!0,n.addEventListener("click",async()=>{const s=document.getElementById("premiumRootFrame"),i=document.getElementById("waiterSendProgressStatus");if(!s||!s.contentWindow){i&&(i.textContent="Game not ready.");return}s.contentWindow.postMessage({source:"BC_MSG",v:1,type:"waiter_messenger_send"},window.location.origin),i&&(i.textContent="Sending progress…")}))}function no(e=""){const t=String(e||"").toLowerCase();return t==="encounter_not_resolved"?"Finish the encounter first, then send progress.":t==="no_current_encounter"?"No active encounter to send yet.":t==="already_sent_for_encounter"?"Progress was already sent for this encounter.":t==="waiter_messenger_only"?"Use the waiter messenger to send progress.":t==="manager_auto_only"?"This progress send is manager-controlled.":t?`Could not send progress: ${t}`:"Could not send progress."}window.addEventListener("message",e=>{const t=e?.data;if(!(!t||t.source!=="BC_MSG"||t.v!==1)&&e.origin===window.location.origin&&!(t.type==="drill_pick"||t.type==="messages_unread_request")&&t.type==="progress_report_submit_result"){const n=document.getElementById("waiterSendProgressStatus"),r=document.getElementById("hudSendProgressStatus"),a=t.ok?t.snapshotOk===!1?`Sent, but snapshot failed${t.snapshotError?`: ${t.snapshotError}`:"."}`:`Progress updated${t.inserted?` (${t.inserted})`:""} ✅`:no(t.error||"unknown_error");n&&(n.textContent=a),r&&(r.textContent=a),nl(),t.ok&&(ps().catch(console.error),to().catch(console.error),Fa().catch(console.error))}});function ha(){const e=document.getElementById("btnHudSendProgress");e&&e.remove()}function ro(e){const t=document.getElementById("hudPanel"),n=document.getElementById("hudBackdrop"),r=document.getElementById("premiumRootFrame"),a=document.getElementById("premiumRoot");t&&t.classList.toggle("hidden",!e),n&&n.classList.toggle("hidden",!e),r&&(r.style.pointerEvents=e?"none":"auto"),a&&(a.style.pointerEvents=e?"none":"auto")}function ao(e){const t=document.getElementById("screenProfile"),n=document.getElementById("premiumRootFrame"),r=document.getElementById("premiumRoot");t&&t.classList.toggle("hidden",!e),n&&(n.style.pointerEvents=e?"none":"auto"),r&&(r.style.pointerEvents=e?"none":"auto")}function so(e){const t=document.getElementById("screenWaiterLeaderboard"),n=document.getElementById("premiumRootFrame"),r=document.getElementById("premiumRoot");t&&t.classList.toggle("hidden",!e),n&&(n.style.pointerEvents=e?"none":"auto"),r&&(r.style.pointerEvents=e?"none":"auto")}function Wd(){le?.(),ka(),ao(!0),Ze?.()}function Br(){ao(!1),Ze?.()}function io(){so(!1),Ze?.()}function Fd(e=[]){const t=document.getElementById("waiterLeaderboardRows");t&&(t.innerHTML=e.map(n=>`
    <tr class="waiter-user-row" data-user-id="${y(n.userId)}">
      <td data-label="Rank">${n.rank}</td>
      <td data-label="Team Member">
        <button
          type="button"
          class="waiter-user-expand-btn"
          data-user-id="${y(n.userId)}"
          aria-expanded="false"
        >
          <span class="waiter-chevron">▶</span>
          <span class="waiter-leaderboard-avatar">${y((n.displayName||"?").slice(0,2).toUpperCase())}</span>
          <span style="display:flex; flex-direction:column; gap:4px; align-items:flex-start;">
            <span>${y(n.displayName||"Unknown")}</span>
            <span class="waiter-leaderboard-role-pill">${y(rt(n.role||"waiter"))}</span>
          </span>
        </button>
      </td>
      <td data-label="Total Points">${tt(n.totalPoints,1)}</td>
      <td data-label="Drill Pass %">${q(n.drillPassRate)}</td>
      <td data-label="Encounter Pass %">${q(n.encounterPassRate)}</td>
      <td data-label="Challenge Success %">${q(n.challengeSuccessRate)}</td>
      <td data-label="Premium Success %">${q(n.premiumSuccessRate)}</td>
      <td data-label="Mastery %">${q(n.masteryRate)}</td>
      <td data-label="Last Active">${wt(n.lastActiveAt)}</td>
    </tr>
    <tr class="waiter-user-detail-row hidden" data-user-detail-id="${y(n.userId)}">
      ${oo(n)}
    </tr>
  `).join(""))}function oo(e={}){return`
    <td colspan="9">
      <div class="waiter-user-detail-panel">
        <div class="waiter-user-detail-left">
          <div class="waiter-user-detail-chart-card">
            <div class="small-text" style="margin-bottom:8px;">Current Skill Shape</div>
            <canvas id="wlUserSkillPie_${y(e.userId)}" class="mb-user-skill-pie" width="240" height="240"></canvas>
            <div id="wlUserSkillLegend_${y(e.userId)}" style="margin-top:12px;"></div>
          </div>
        </div>
        <div class="waiter-user-detail-right">
          <div class="waiter-user-metric-grid">
            <div class="mb-user-metric-card"><div class="small-text">Total Points</div><strong>${tt(e.totalPoints,1)}</strong></div>
            <div class="mb-user-metric-card"><div class="small-text">Eligibility Tier</div><strong>T${e.eligibilityTier||1}</strong></div>
            <div class="mb-user-metric-card"><div class="small-text">Readiness</div><strong>${q(e.readiness)}</strong></div>
            <div class="mb-user-metric-card"><div class="small-text">Drill Pass</div><strong>${q(e.drillPassRate)}</strong></div>
            <div class="mb-user-metric-card"><div class="small-text">Encounter Pass</div><strong>${q(e.encounterPassRate)}</strong></div>
            <div class="mb-user-metric-card"><div class="small-text">Challenge Success</div><strong>${q(e.challengeSuccessRate)}</strong></div>
            <div class="mb-user-metric-card"><div class="small-text">Premium Success</div><strong>${q(e.premiumSuccessRate)}</strong></div>
            <div class="mb-user-metric-card"><div class="small-text">Mastery</div><strong>${q(e.masteryRate)}</strong></div>
            <div class="mb-user-metric-card"><div class="small-text">Last Active</div><strong>${y(wt(e.lastActiveAt))}</strong></div>
          </div>
          <div class="waiter-user-badge-row" style="margin-top:12px;">
            <span class="mb-badge">Strongest: ${y(e.strongestSkill||"—")}</span>
            <span class="mb-badge">Weakest: ${y(e.weakestSkill||"—")}</span>
            <span class="mb-badge">${y(Number(e.challengeReadiness||0)>=.7?"Challenge Ready":"Needs Build-Up")}</span>
            <span class="mb-badge">Readiness: ${y(Ya(e.readiness,e.readinessLabel))}</span>
          </div>
        </div>
      </div>
    </td>
  `}async function qd(e,t,n={}){const r=String(e||"").trim(),a=String(t||"").trim();if(!r)return{...n};const s=new Date(Date.now()-720*60*60*1e3).toISOString(),i=I.from("bc_progression_state_v1").select("canonical_state, updated_at").eq("user_id",r).order("updated_at",{ascending:!1}).limit(1).maybeSingle(),l=I.from("bc_skill_snapshots_v1").select("created_at, read_pct, framing_pct, delivery_pct, recovery_pct, closing_pct").eq("user_id",r).order("created_at",{ascending:!1}).limit(20),c=I.from("bc_readiness_v1").select("*").eq("user_id",r).maybeSingle(),o=I.from("bc_encounter_resolutions_v2").select("occurred_at, performance_grade, chain_signal, is_green, tier").eq("user_id",r).neq("mode","demo").gte("occurred_at",s).order("occurred_at",{ascending:!1}).limit(200),d=I.from("bc_messages_v1").select("created_at, type, payload").eq("sender_user_id",r).in("type",["drill_completed","timed_challenge_completed","timed_challenge_expired"]).is("archived_at",null).order("created_at",{ascending:!1}).limit(200);a&&(i.eq("restaurant_id",a),l.eq("restaurant_id",a),c.eq("restaurant_id",a),o.eq("restaurant_id",a),d.eq("restaurant_id",a));const[p,m,g,u,f,h]=await Promise.all([i,l,c,o,d,I.from("profiles").select("user_id, display_name, role").eq("user_id",r).maybeSingle()]),w=p?.data||{},S=Array.isArray(m?.data)?m.data:[],E=g?.data||{},b=Array.isArray(u?.data)?u.data:[],B=Array.isArray(f?.data)?f.data:[],L=h?.data||{},k=String(F(L)||n?.role||"").toLowerCase(),v=k==="single_manager"||k==="group_manager"||k==="enterpriser",R=Sa(S),T=n?.skillShape&&typeof n.skillShape=="object"?n.skillShape:{},A=Oe.reduce((Q,ie)=>Q+Number(R?.[ie.key]||0),0),W=Oe.reduce((Q,ie)=>Q+Number(T?.[ie.key]||0),0),H=lo(n),P=Oe.reduce((Q,ie)=>Q+Number(H?.[ie.key]||0),0);let C={},D=0;if(v&&A<=0&&W<=0&&P<=0)try{const Q=await I.from("bc_skill_snapshots_v1").select("created_at, read_pct, framing_pct, delivery_pct, recovery_pct, closing_pct").eq("user_id",r).order("created_at",{ascending:!1}).limit(20),ie=Array.isArray(Q?.data)?Q.data:[];C=Sa(ie),D=Oe.reduce((ot,zt)=>ot+Number(C?.[zt.key]||0),0)}catch(Q){console.warn("[LEADERBOARD] cross-restaurant skill fallback failed",{userId:r,error:Q})}const V=A>0?R:W>0?T:D>0?C:P>0?H:T,M=w?.canonical_state&&typeof w.canonical_state=="object"?w.canonical_state:{},N=M?.economy&&typeof M.economy=="object"?M.economy:{},re=M?.authority&&typeof M.authority=="object"?M.authority:{},Re=Math.max(0,Number(N?.points||n?.totalPoints||0)),ge=Math.max(1,Math.min(3,Math.round(me(re?.tierToServe,N?.tier,n?.servedTier,n?.eligibilityTier,1)||1))),at=B.filter(Q=>String(Q?.type||"")==="drill_completed"),$=at.filter(Q=>{const ie=Number(Q?.payload?.repsDone||0),ot=Number(Q?.payload?.repTarget||0);return ot>0&&ie>=ot}).length,Y=B.filter(Q=>String(Q?.type||"")==="timed_challenge_completed"),pe=B.filter(Q=>String(Q?.type||"")==="timed_challenge_expired"),ye=Y.length+pe.length,Fe=b.filter(Q=>{const ie=String(Q?.performance_grade||"").toUpperCase();return ie==="A"||ie==="B"||String(Q?.chain_signal||"").toLowerCase()==="green"||!!Q?.is_green}).length,_e=b.filter(Q=>String(Q?.performance_grade||"").toUpperCase()==="A").length,Gn=Y.filter(Q=>!!Q?.payload?.premiumSuccess).length,Se=at.length?$/at.length:Number(n?.drillPassRate||0),Wn=b.length?Fe/b.length:Number(n?.encounterPassRate||0),st=ye?Y.length/ye:Number(n?.challengeSuccessRate||0),Le=Y.length?Gn/Y.length:Number(n?.premiumSuccessRate||0),Yt=b.length?_e/b.length:Number(n?.masteryRate||0),it=me(E?.readiness_score,E?.readiness_pct),Lt=Math.max(0,Math.min(1,me(it!=null?it>1?it/100:it:null,n?.readiness,Yt,Re>=10?.8:Re>=5?.62:.4)||0)),Fn=pt(E?.readiness,n?.readinessLabel,Lt>=.8?"STABLE":Lt>=.62?"GROWING":"FRAGILE"),qn=Math.max(0,Math.min(1,Lt*.45+Wn*.35+st*.2)),qe=za(V);return{...n,userId:r,displayName:String(L?.display_name||n?.displayName||r).trim(),role:F(L)||n?.role||"waiter",totalPoints:Re,drillPassRate:Se,encounterPassRate:Wn,challengeSuccessRate:st,premiumSuccessRate:Le,masteryRate:Yt,lastActiveAt:pt(w?.updated_at,b[0]?.occurred_at,B[0]?.created_at,n?.lastActiveAt),eligibilityTier:ge,readiness:Lt,readinessLabel:Fn,servedTier:ge,challengeReadiness:qn,strongestSkill:W>A?n?.strongestSkill||qe.strongestSkill:(P>A&&A===0,qe.strongestSkill),weakestSkill:W>A?n?.weakestSkill||qe.weakestSkill:(P>A&&A===0,qe.weakestSkill),skillShape:V}}function jd(e={}){document.querySelectorAll(".waiter-user-expand-btn").forEach(t=>{t.__wired||(t.__wired=!0,t.addEventListener("click",async()=>{await Vd(t.dataset.userId,e)}))})}async function Vd(e,t={}){const n=document.querySelector(`.waiter-user-expand-btn[data-user-id="${CSS.escape(String(e||""))}"]`),r=document.querySelector(`.waiter-user-detail-row[data-user-detail-id="${CSS.escape(String(e||""))}"]`);if(!n||!r)return;if(!r.classList.contains("hidden")){r.classList.add("hidden"),n.classList.remove("is-open"),n.setAttribute("aria-expanded","false");return}Kd(e),r.classList.remove("hidden"),n.classList.add("is-open"),n.setAttribute("aria-expanded","true");const s=_?.restaurant?.id||j?.()||_?.activeRestaurantId||_?.profile?.restaurant_id||null,i=await qd(e,s,t?.[e]||{});t[e]=i,r.innerHTML=oo(i);const l=document.getElementById(`wlUserSkillPie_${e}`),c=document.getElementById(`wlUserSkillLegend_${e}`);l&&i&&!l.__drawn&&(yo(l,i.skillShape,{centerTop:`T${i.eligibilityTier||1}`,centerBottom:`${Math.round(Number(i.readiness||0)*100)}%`}),l.__drawn=!0),c&&ho(c,i.skillShape,{strongestSkill:i.strongestSkill,weakestSkill:i.weakestSkill}),r.scrollIntoView({block:"nearest",behavior:"smooth"})}function Kd(e=null){document.querySelectorAll(".waiter-user-detail-row").forEach(t=>{e&&t.dataset.userDetailId===e||t.classList.add("hidden")}),document.querySelectorAll(".waiter-user-expand-btn").forEach(t=>{e&&t.dataset.userId===e||(t.classList.remove("is-open"),t.setAttribute("aria-expanded","false"))})}function lo(e={}){const t=Math.round(Math.max(0,Math.min(100,Number(e?.drillPassRate||0)*100))),n=Math.round(Math.max(0,Math.min(100,Number(e?.encounterPassRate||0)*100))),r=Math.round(Math.max(0,Math.min(100,Number(e?.challengeSuccessRate||0)*100))),a=Math.round(Math.max(0,Math.min(100,Number(e?.premiumSuccessRate||0)*100))),s=Math.round(Math.max(0,Math.min(100,Number(e?.masteryRate||0)*100))),i=Math.round(Math.max(0,Math.min(100,Number(e?.readiness||0)*100))),l=Math.max(0,Number(e?.totalPoints||0));if(t+n+r+a+s+i<=0){const o=Math.max(28,Math.min(86,Math.round(i||(l>=100?82:l>=50?68:l>=20?56:l>0?44:34))));return{read:o,framing:Math.max(24,o-4),delivery:Math.min(92,o+6),recovery:Math.max(24,o-2),closing:Math.max(24,o-1)}}return{read:Math.max(i,n),framing:Math.max(t,Math.round((t+i)/2)),delivery:Math.max(n,s),recovery:Math.max(r,Math.round((r+i)/2)),closing:Math.max(a,s)}}function Yd(e=[],t=[]){const n=new Map,r=(a,s)=>{const i=String(a||"").trim(),l=String(s||"").trim();return!i||i===l||!!l&&i===l.slice(0,8)};return(e||[]).forEach(a=>{const s=String(a?.userId||"");s&&n.set(s,{...a})}),(t||[]).forEach(a=>{const s=String(a?.userId||"");if(!s)return;const i=n.get(s)||null;if(i){n.set(s,{...i,displayName:r(i.displayName,s)&&!r(a.displayName,s)?a.displayName:i.displayName,role:a.role||i.role||"group_manager"});return}n.set(s,{userId:s,displayName:a.displayName||s.slice(0,8),role:a.role||"group_manager",totalPoints:0,drillPassRate:0,encounterPassRate:0,challengeSuccessRate:0,premiumSuccessRate:0,masteryRate:0,lastActiveAt:"",rank:0})}),Array.from(n.values()).sort((a,s)=>{const i=Number(s?.totalPoints||0)-Number(a?.totalPoints||0);return i||String(a?.displayName||"").localeCompare(String(s?.displayName||""))}).map((a,s)=>({...a,rank:s+1}))}async function co(e=null){const t=String(e||"").trim();if(!t)return[];const n=new Map,r=a=>{const s=String(a?.user_id||"").trim();s&&n.set(s,{userId:s,displayName:String(a?.display_name||a?.full_name||a?.name||"").trim(),role:F(a)||String(a?.role||"").toLowerCase()||"waiter"})};try{const a=await Z(I.rpc("bc_get_restaurant_environment_profiles_v1",{p_restaurant_id:t}),12e3,"rpc.restaurant_environment_profiles");if(!a?.error&&Array.isArray(a.data)&&a.data.length)return a.data.forEach(r),Array.from(n.values())}catch(a){console.warn("[LEADERBOARD] restaurant environment rpc failed",a)}try{const a=await Z(I.from("profiles").select("user_id, display_name, role, scope_id").eq("restaurant_id",t).order("display_name",{ascending:!0}),12e3,"profiles.restaurant_environment.direct");a?.error||(a.data||[]).forEach(r)}catch(a){console.warn("[LEADERBOARD] restaurant environment direct profiles failed",a)}try{const a=await Z(I.from("bc_scope_restaurants").select("scope_id").eq("restaurant_id",t).limit(20),12e3,"scope_restaurants.restaurant_environment"),s=Array.from(new Set((a?.data||[]).map(i=>String(i?.scope_id||"").trim()).filter(Boolean)));if(s.length){const i=await Z(I.from("profiles").select("user_id, display_name, role, scope_id").in("scope_id",s).order("display_name",{ascending:!0}),12e3,"profiles.restaurant_environment.scope");i?.error||(i.data||[]).forEach(r)}}catch(a){console.warn("[LEADERBOARD] restaurant environment scope profiles failed",a)}return Array.from(n.values())}async function zd(e=[]){const t=Array.from(new Set((e||[]).map(s=>String(s?.userId||"").trim()).filter(Boolean))),n=new Map,r=new Map;try{const s=_?.restaurant?.id||j?.()||_?.activeRestaurantId||_?.profile?.restaurant_id||null;if((await co(s)||[]).forEach(l=>{const c=String(l?.userId||"").trim(),o=String(l?.displayName||"").trim();c&&o&&r.set(c,o)}),s&&t.length){const{data:l,error:c}=await I.from("bc_messages_v1").select("sender_user_id, receiver_user_id, payload").eq("restaurant_id",s).or(t.map(o=>`sender_user_id.eq.${o},receiver_user_id.eq.${o}`).join(",")).is("archived_at",null).order("created_at",{ascending:!1}).limit(200);c||(l||[]).forEach(o=>{const d=o?.payload||{},p=String(o?.sender_user_id||""),m=String(o?.receiver_user_id||""),g=String(d?.senderDisplayName||d?.sender_display_name||d?.managerDisplayName||d?.manager_display_name||"").trim(),u=String(d?.receiverDisplayName||d?.receiver_display_name||d?.targetDisplayName||d?.target_display_name||"").trim();p&&g&&!n.has(p)&&n.set(p,g),m&&u&&!n.has(m)&&n.set(m,u)})}}catch(s){console.warn("[LEADERBOARD] message display name hydrate failed",s)}const a=[];for(const s of e||[]){const i=String(s?.userId||"").trim(),l=String(s?.displayName||"").trim(),c=!l||l===i||i&&l===i.slice(0,8);if(!i||!c){a.push(s);continue}try{const o=await $n(i),d=String(o?.display_name||"").trim();a.push({...s,displayName:d||r.get(i)||n.get(i)||s.displayName||"Unknown"})}catch(o){console.warn("[LEADERBOARD] row display name hydrate failed",{userId:i,error:o}),a.push({...s,displayName:r.get(i)||n.get(i)||s.displayName||"Unknown"})}}return a}async function Qd(){const e=document.getElementById("waiterLeaderboardRestaurantLabel"),t=document.getElementById("waiterLeaderboardManagerContext"),n=document.getElementById("waiterLeaderboardMsg"),r=document.getElementById("waiterLeaderboardRows");if(!e||!t||!n||!r)return;const a=_?.restaurant?.name||j?.()||_?.activeRestaurantId||"this restaurant";e.textContent=`Live performance snapshot for ${a}.`,t.textContent="",n.textContent="Loading leaderboard…",r.innerHTML="";try{const s=await bn({force:!0}),i=await gu(_?.restaurant?.id||j?.()||_?.activeRestaurantId||null,_?.profile?.scope_id||null),l=new Map;(s?.users||[]).forEach(p=>{["single_manager","group_manager","enterpriser"].includes(String(p?.role||"").toLowerCase())&&l.set(String(p.userId||""),{userId:p.userId,displayName:p.displayName,role:p.role||"waiter"})}),(i||[]).forEach(p=>{p?.userId&&l.set(String(p.userId),p)});const c=Array.from(l.values()),o=await zd(Yd(s?.users||[],i||[])),d=Object.fromEntries(o.map(p=>[p.userId,p]));t.textContent=c.length?`Managers linked here: ${c.map(p=>`${p.displayName} (${rt(p.role||"waiter")})`).join(", ")}`:"Managers linked here are not currently ranked in this leaderboard view.",Fd(o),jd(d),n.textContent=o.length?"":"No leaderboard data yet for this restaurant."}catch(s){console.error("[LEADERBOARD] load failed",s),n.textContent=s?.message||"Failed to load leaderboard."}}async function Jd(){le?.(),Br?.(),ka(),so(!0),Ze?.(),await Qd()}window.__BC_HUD_TIMELINE_TARGET_USER_ID__=window.__BC_HUD_TIMELINE_TARGET_USER_ID__||null;function Mr(){const e=_?.session?.user?.id||_?.session?.userId||null,t=j?.()||_?.restaurant?.id||_?.activeRestaurantId||_?.profile?.restaurant_id||_?.profile?.restaurantId||null;return{userId:e||null,restaurantId:t||null}}function Xd(){const e=Mr();return window.__BC_HUD_TIMELINE_TARGET_USER_ID__||e.userId||null}function Zd(){const e=document.getElementById("screenPlay"),t=document.getElementById("screenPremiumApp"),n=e&&!e.classList.contains("hidden"),r=t&&!t.classList.contains("hidden");return!!(n||r)}function wa(e=""){if(Zd()){console.warn("[BC] unmount blocked (play active)",e);return}console.log("[BC] demo game unmounted ✅",e);try{document.getElementById("gameRootDemoFrame")?.remove()}catch{}const t=document.getElementById("gameRootDemo");t&&(t.innerHTML="");try{yn=null}catch{}}function gt(e=""){console.log("[BC] destroyDemoIframe",e);try{document.getElementById("gameRootDemoFrame")?.remove()}catch{}const t=document.getElementById("gameRootDemo");t&&(t.innerHTML="");try{yn=null}catch{}}function we(e=""){console.log("[BC] destroyPremiumIframe",e);const t=document.getElementById("premiumRoot"),n=document.getElementById("premiumRootFrame");if(t&&(t.innerHTML=""),!t&&n)try{n.src="about:blank"}catch{}window.__BC_PENDING_START_DRILL__=null,window.BC_PENDING_START_DRILL=null,window.__BC_IFRAME_EPOCH__=Date.now(),window.__BC_SOURCE_CTX_MAP__=new WeakMap}function gr(){const e=document.getElementById("btnManagerBoard");if(!e){console.warn("[BC] btnManagerBoard not found");return}e.__bcBound||(e.__bcBound=!0,e.addEventListener("click",async t=>{t.preventDefault();try{await qr("nav")}catch(n){console.error("[BC] routeManagerBoard failed",n)}}),console.log("[BC] btnManagerBoard wired ✅"))}let yn=null,ba=Date.now();window.__BC_SOURCE_CTX_MAP__=window.__BC_SOURCE_CTX_MAP__||new WeakMap;window.__BC_IFRAME_EPOCH__=window.__BC_IFRAME_EPOCH__||0;window.__BC_LOGOUT_LOCK__=window.__BC_LOGOUT_LOCK__||0;function eu(){const e=document.getElementById("gameRootDemo"),t=document.getElementById("premiumRoot"),n=document.getElementById("premiumRootFrame");if(e&&(e.innerHTML=""),t&&(t.innerHTML=""),!t&&n)try{n.src="about:blank"}catch{}}function va(e){yn=null,ba=Date.now(),eu(),new Date().toISOString()}function tu({mode:e="premium",showBack:t=!1,backTo:n="screenPremiumApp",urlOverride:r=null,epoch:a=Date.now(),bustCache:s=!1}={}){const i=r?new URL(r,window.location.href):new URL("/game/game.html",window.location.origin);if(i.origin!==window.location.origin)throw new Error("buildGameIframeUrl: urlOverride must be same-origin");return i.searchParams.set("mode",String(e||"premium").toLowerCase()),i.searchParams.set("showBack",t?"1":"0"),i.searchParams.set("backTo",String(n||"screenPremiumApp")),s&&i.searchParams.set("v",String(Date.now())),i.toString()}function uo(e,t){if(xt()){console.warn("[BC] mountGameIframe blocked (logging out)",{targetId:e,mode:t});return}const n=document.getElementById(e);if(!n||n.querySelector("iframe")&&yn===t)return;yn=t;const i=`/game/game.html?mode=${encodeURIComponent(t)}&demo=1&v=${ba}`;n.innerHTML=`
    <iframe
      id="${e}Frame"
      src="${i}"
      title="BottleCaller Game"
      style="
        width: 100%;
        height: 420px;
        border: 1px solid rgba(255,255,255,0.10);
        border-radius: 14px;
        background: rgba(0,0,0,0.35);
        box-shadow: 0 10px 28px rgba(0,0,0,0.55);
      "
      loading="eager"
    ></iframe>
  `,new Date().toISOString()}window.addEventListener("message",e=>{const t=e?.data;if(!t||t.type!=="BC_IFRAME_HEIGHT")return;const n=document.getElementById("gameRootDemoFrame"),r=document.getElementById("premiumRootFrame"),a=t.mode==="premium"?r:n;if(!a)return;const s=Number(t.height);if(!Number.isFinite(s))return;const i=Math.max(360,Math.min(860,s+24));a.style.height=i+"px"});async function $n(e){const t=await Z(I.from("profiles").select("user_id, role, restaurant_id, display_name, access_tier, scope_type, scope_id, premium_pass_expires_at, is_first50, premium_grant_source, premium_grant_ref").eq("user_id",e).maybeSingle(),12e3,"profiles.select");if(t.error)throw t.error;return t.data}async function et(e){const t=await Z(I.from("restaurants").select("id,name,code,seat_limit,require_invite,created_by").eq("id",e).single(),12e3,"restaurants.select");if(t.error)throw t.error;return t.data}async function xr(e=null){const t=String(e||j()||"");if(!t)return[];const n=await Z(I.from("restaurant_invites").select("id,email,status,created_at,accepted_user_id,revoked_at").eq("restaurant_id",t).order("created_at",{ascending:!1}),12e3,"invites.select");if(n.error)throw n.error;return n.data||[]}async function hn(){const e=_.profile?.restaurant_id||null,t=document.getElementById("mbSeatStatus"),n=document.getElementById("mbSeatDetail");if(!e){t&&(t.textContent="Seats: —"),n&&(n.textContent="No restaurant_id on profile.");return}const{data:r,error:a}=await I.from("bc_restaurant_seats_v1").select("restaurant_id, seat_limit, seats_used, seats_remaining").eq("restaurant_id",e).maybeSingle();if(a){t&&(t.textContent="Seats: error"),n&&(n.textContent="Failed to load seats: "+a.message);return}if(!r){t&&(t.textContent="Seats: —"),n&&(n.textContent="No seats row found for this restaurant.");return}t&&(t.textContent=`Seats: ${r.seats_used}/${r.seat_limit}`),n&&(n.textContent=`Seat limit: ${r.seat_limit} • Used (premium waiters): ${r.seats_used} • Remaining: ${r.seats_remaining}`)}async function aa(e){if(!Ue(_.profile?.role)){alert("Managers only.");return}const t=_.profile?.restaurant_id||null;if(!t)return alert("Missing restaurant_id on profile.");const{error:n}=await I.rpc("admin_set_seat_limit",{p_restaurant_id:t,p_new_limit:e});if(n){alert("Seat update failed: "+n.message);return}await hn()}async function nu(){if(!Ue(_.profile?.role)){alert("Managers only.");return}const e=document.getElementById("mbEnterpriseCode"),t=document.getElementById("mbEnterpriseMsg"),n=(e?.value||"").trim().toUpperCase();if(!n)return;t&&(t.textContent="Redeeming…");const{data:r,error:a}=await I.rpc("redeem_code",{p_code:n});if(a){t&&(t.textContent="Failed: "+a.message);return}if(r?.ok===!1){t&&(t.textContent="Failed: "+(r?.error||"unknown"));return}t&&(t.textContent="✅ Redeemed. Reloading profile…");try{const s=_.session;s?.user?.id&&(_.profile=await $n(s.user.id))}catch{}t&&(t.textContent="✅ Enterprise upgrade applied (if code was enterprise).")}async function ru(){const e=document.getElementById("mbGroupSetupCode"),t=document.getElementById("mbGroupSetupMsg"),n=(e?.value||"").trim().toUpperCase();if(!n)return;t&&(t.textContent="Redeeming…");const{data:r,error:a}=await I.rpc("redeem_code",{p_code:n});if(a){t&&(t.textContent="Failed: "+a.message);return}if(r?.ok===!1){t&&(t.textContent="Failed: "+(r?.error||"unknown"));return}t&&(t.textContent="✅ Redeemed. Reloading profile…");try{const s=window.appState?.session;s?.user?.id&&(window.appState.profile=await $n(s.user.id))}catch{}try{await Wa()}catch{}try{Lr()}catch{}t&&(t.textContent="✅ Group manager scope applied.")}function mo(){const e=document.getElementById("mbRedeemGroupSetup");!e||e.__wired||(e.__wired=!0,e.addEventListener("click",ru))}function go(){const e=Ue(_.profile?.role),t=document.getElementById("mbSeat15"),n=document.getElementById("mbSeat30"),r=document.getElementById("mbSeat60"),a=document.getElementById("mbRefreshSeats"),s=document.getElementById("mbRedeemEnterprise"),i=document.getElementById("mbEnterpriseCode"),l=document.getElementById("mbEnterpriseMsg");[t,n,r].forEach(c=>{c&&(c.style.display=e?"":"none")}),s&&(s.style.display=e?"":"none"),i&&(i.style.display=e?"":"none"),l&&!e&&(l.textContent=""),t&&(t.onclick=()=>aa(15)),n&&(n.onclick=()=>aa(30)),r&&(r.onclick=()=>aa(60)),a&&(a.onclick=()=>hn()),s&&(s.onclick=()=>nu()),hn()}function mt(e){const t=String(e||"overview").toLowerCase();return{staff:"people",history:"performance",insights:"performance",tournament:"selection",tournament_setup:"selection",attribute_abilities:"live_controls",area_abilities:"live_controls"}[t]||t}function wn(){const e=document.getElementById("mbMenu");if(!e||e.__bcBound)return;e.__bcBound=!0,window.__BC_MB_NORMALIZETAB__=mt;function t(n){const r=mt(n);e.querySelectorAll("[data-mbtab]").forEach(a=>{const s=mt(a.getAttribute("data-mbtab"))===r;a.classList.toggle("is-active",s),a.setAttribute("aria-selected",s?"true":"false")}),document.querySelectorAll("#mbPanels .mbTab").forEach(a=>a.classList.add("hidden")),document.getElementById(`mbTab_${r}`)?.classList.remove("hidden")}window.__BC_MB_SHOWTAB__=t,window.__BC_MB_LOADTAB__=async function(n){const r=mt(n);if(r){if(r==="overview"){await ae(),pr();return}if(r==="people"){await ae(),Cn();return}if(r==="billing")return hn?.();if(r==="performance"){await Hs();return}if(r==="selection"){await Ea();return}if(r==="messenger")return Rt(),vr(),Be();if(r==="live_controls"){await ae(),O("renderManagerBoardOverviewLiveEffects",()=>un?.()),O("renderManagerLiveControlPanels",()=>Mn?.()),await Et().catch(console.warn);return}}},e.addEventListener("click",async n=>{const r=n.target?.closest?.("[data-mbtab]");if(!r)return;const a=mt(r.getAttribute("data-mbtab"));t(a),a==="overview"&&(await ae(),pr()),a==="people"&&(await ae(),Cn()),a==="billing"&&await hn?.(),a==="performance"&&await Hs(),a==="selection"&&await Ea(),a==="messenger"&&(Rt(),vr(),await fr(),await Be(),ce?.({thread:!0,board:!0,economy:!1,liveControls:!1,challengeMeta:!0})),a==="live_controls"&&(await ae(),O("renderManagerBoardOverviewLiveEffects",()=>un?.()),O("renderManagerLiveControlPanels",()=>Mn?.()),await Et().catch(console.warn))}),t(window.__BC_MB_DEFAULTTAB__||"overview")}async function Ka(){const e=_?.profile||{},t=J(e),n=JSON.stringify({role:F(e),scopeId:e?.scope_id||e?.scopeId||"",restaurantId:e?.restaurant_id||e?.restaurantId||"",activeRestaurantId:_?.activeRestaurantId||""});if(ke.key===n&&Array.isArray(ke.rows)&&Date.now()-Number(ke.loadedAt||0)<Bc)return window.__BC_ALLOWED_RESTAURANT_ROWS__=ke.rows,window.__BC_ALLOWED_RESTAURANT_IDS__=ke.rows.map(r=>String(r.id)),ke.rows;if(ct?.key===n&&ct?.promise)return ct.promise;if(!t.canManageMultipleRestaurants){const r=String(e?.restaurant_id||e?.restaurantId||""),a=_?.restaurant?.name||"My Restaurant",s=r?[{id:r,name:a}]:[];return window.__BC_ALLOWED_RESTAURANT_ROWS__=s,window.__BC_ALLOWED_RESTAURANT_IDS__=s.map(i=>String(i.id)),ke={key:n,loadedAt:Date.now(),rows:s},s}ct={key:n,promise:(async()=>{try{const i=e?.scope_id||e?.scopeId||null,l=await qi(i),c=Array.isArray(l)?l.map(o=>({id:String(o?.id||o?.restaurant_id||""),name:o?.name||o?.restaurant_name||null})).filter(o=>o.id):[];if(c.length){window.__BC_ALLOWED_RESTAURANT_ROWS__=c,window.__BC_ALLOWED_RESTAURANT_IDS__=c.map(d=>String(d.id));const o=j();return(!o||!c.some(d=>d.id===o))&&He(c[0].id),ke={key:n,loadedAt:Date.now(),rows:c},c}}catch(i){console.warn("[MB] scoped restaurant load failed",i)}const r=String(e?.restaurant_id||e?.restaurantId||""),a=_?.restaurant?.name||"My Restaurant",s=r?[{id:r,name:a}]:[];return window.__BC_ALLOWED_RESTAURANT_ROWS__=s,window.__BC_ALLOWED_RESTAURANT_IDS__=s.map(i=>String(i.id)),ke={key:n,loadedAt:Date.now(),rows:s},s})()};try{return await ct.promise}finally{ct?.key===n&&(ct=null)}}function po(){const e=_?.profile||{},t=J(e),n=document.getElementById("mbRestaurantPicker");if(!n)return;if(!t.canManageMultipleRestaurants){n.classList.add("hidden");return}const r=Un();n.innerHTML="",r.forEach(s=>{const i=String(s?.id||"");if(!i)return;const l=document.createElement("option");l.value=i,l.textContent=s?.name||`Restaurant ${i.slice(0,8)}`,n.appendChild(l)});const a=j();a&&(n.value=a),n.classList.remove("hidden")}function au(){const e=document.getElementById("mbRestaurantContextCard");if(!e)return;const t=_?.profile||{},n=J(t),r=rt(t),a=j(),s=Nr(a);e.innerHTML=`
    <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
      <div style="font-weight:600;">Restaurant Context</div>
      <div><b>Role:</b> ${y(r)}</div>
      <div><b>Active restaurant:</b> ${y(s)}</div>
      <div class="small" style="opacity:.75;">
        ${n.canManageMultipleRestaurants?"You can switch between restaurants in your allowed scope.":"You are currently scoped to one restaurant."}
      </div>
    </div>
  `}function su(){const e=document.getElementById("mbGroupOverviewCard");if(!e)return;const t=_?.profile||{};if(!J(t).canManageMultipleRestaurants){e.innerHTML="";return}const r=Un(),a=j(),s=Nr(a);e.innerHTML=`
    <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
      <div style="font-weight:600;">Group Overview</div>
      <div><b>Accessible restaurants:</b> ${r.length}</div>
      <div><b>Current control target:</b> ${y(s)}</div>
      <div class="small" style="opacity:.75;">
        Group-level multi-restaurant summaries and comparisons will appear here.
      </div>
    </div>
  `}function iu(){const e=document.getElementById("mbGroupMetricsCard");if(!e)return;const t=_?.profile||{};if(!J(t).canManageMultipleRestaurants){e.innerHTML="";return}const r=Mu();e.innerHTML=`
    <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
      <div style="font-weight:600;">Cross-Restaurant Metrics</div>
      <div><b>Accessible restaurants:</b> ${r.restaurantsCount}</div>
      <div><b>Pending invites:</b> ${r.pendingInvitesCount}</div>
      <div><b>Recent timed challenge activity:</b> ${r.recentTimedChallengesCount}</div>
      <div><b>Recent drill completions:</b> ${r.recentDrillCompletionsCount}</div>
      <div class="small" style="opacity:.75;">
        These metrics reflect the current allowed restaurant scope.
      </div>
    </div>
  `}function ou(){const e=document.getElementById("mbGroupRestaurantComparisonCard");if(!e)return;const t=_?.profile||{};if(!J(t).canManageMultipleRestaurants){e.innerHTML="";return}const r=xu();if(!r.length){e.innerHTML=`
      <div class="card" style="padding:12px;">
        <div style="font-weight:600;">Restaurant Comparison</div>
        <div class="small" style="opacity:.75; margin-top:8px;">
          No scoped restaurant data available.
        </div>
      </div>
    `;return}const a=r.map(s=>`
      <div
        data-mb-restaurant-row="${y(s.restaurantId)}"
        style="
          padding:10px;
          border:1px solid rgba(255,255,255,0.10);
          border-radius:10px;
          background:${s.isActive?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.03)"};
        "
      >
        <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
          <div style="font-weight:600;">${y(s.name)}</div>
          <div class="small" style="opacity:.75;">${s.isActive?"ACTIVE":""}</div>
        </div>

        <div class="small" style="opacity:.9; margin-top:6px;">
          Pending invites: ${s.pendingInvites}
        </div>
        <div class="small" style="opacity:.9;">
          Timed challenge activity: ${s.timedChallengeActivity}
        </div>
        <div class="small" style="opacity:.9;">
          Drill completions: ${s.drillCompletions}
        </div>

        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
          <button
            type="button"
            data-mb-switch-restaurant="${y(s.restaurantId)}"
            class="btn-ghost"
          >
            Open restaurant
          </button>

          <button
            type="button"
            data-mb-open-challenge="${y(s.restaurantId)}"
            class="btn"
          >
            Assign challenge
          </button>
        </div>
      </div>
    `).join("");e.innerHTML=`
    <div class="card" style="display:flex; flex-direction:column; gap:10px; padding:12px;">
      <div style="font-weight:600;">Restaurant Comparison</div>
      <div class="small" style="opacity:.75;">
        Click a restaurant to switch your active control target.
      </div>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${a}
      </div>
    </div>
  `}function lu(){const e=document.getElementById("mbTimedChallengeComposer");e&&e.scrollIntoView({behavior:"smooth",block:"nearest"}),(document.getElementById("mbTimedChallengeTitle")||document.getElementById("mbTimedChallengeFocus"))?.focus?.()}async function cu(e){const t=String(e||"");if(!t||!He(t))return!1;const n=document.getElementById("mbRestaurantPicker");n&&(n.value=t),vn(),Ee();try{const a=await et(t);a&&(_.restaurant=a)}catch(a){console.warn("[MB] loadRestaurant before challenge context failed",a)}await ae?.(t),await kn?.(t),window.__BC_MB_DEFAULTTAB__="messenger",window.__BC_MB_SHOWTAB__?.("messenger"),await window.__BC_MB_LOADTAB__?.("messenger");const r=document.getElementById("mbTimedChallengeStatus");return r&&(r.textContent=`Active restaurant set to ${Nr(t)}. Select a waiter thread to assign a challenge.`),lu(),!0}function du(){const e=document.getElementById("mbGroupRestaurantComparisonCard");!e||e.__wired||(e.__wired=!0,e.addEventListener("click",async t=>{const n=t.target?.closest?.("[data-mb-open-challenge]");if(n){const l=String(n.getAttribute("data-mb-open-challenge")||"");if(!l)return;await cu(l);return}const r=t.target?.closest?.("[data-mb-switch-restaurant]");if(r){const l=String(r.getAttribute("data-mb-switch-restaurant")||"");if(!l||!He(l))return;const c=document.getElementById("mbRestaurantPicker");c&&(c.value=l),vn(),Ee();try{const o=await et(l);o&&(_.restaurant=o)}catch(o){console.warn("[MB] loadRestaurant after comparison switch failed",o)}await ae?.(l),await kn?.(l);return}const a=t.target?.closest?.("[data-mb-restaurant-row]");if(!a)return;const s=String(a.getAttribute("data-mb-restaurant-row")||"");if(!s||!He(s))return;const i=document.getElementById("mbRestaurantPicker");i&&(i.value=s),vn(),Ee();try{const l=await et(s);l&&(_.restaurant=l)}catch(l){console.warn("[MB] loadRestaurant after comparison row click failed",l)}await ae?.(s),await kn?.(s)}))}function uu(){const e=document.getElementById("mbRestaurantPicker");!e||e.__wired||(e.__wired=!0,e.addEventListener("change",async()=>{const t=String(e.value||"");if(t&&He(t)){vn(),Ee();try{const n=await et(t);n&&(_.restaurant=n)}catch(n){console.warn("[MB] loadRestaurant after switch failed",n)}await ae?.(t),await kn?.(t)}}))}function Lr(){const e=_.profile||{},t=J(e),n=document.querySelector('#mbMenu [data-mbtab="overview"]');n&&(n.style.display=t.canAccessManagerBoard?"":"none");const r=document.querySelector('#mbMenu [data-mbtab="selection"]');r&&(r.style.display=t.canAccessManagerBoard?"":"none");const a=document.querySelector('#mbMenu [data-mbtab="billing"]');a&&(a.style.display=t.canAccessManagerBoard?"":"none");const s=document.querySelector('#mbMenu [data-mbtab="people"]');s&&(s.style.display=t.canAccessManagerBoard?"":"none");const i=document.querySelector('#mbMenu [data-mbtab="messenger"]');i&&(i.style.display=t.canAccessManagerBoard?"":"none");const l=document.querySelector('#mbMenu [data-mbtab="live_controls"]');l&&(l.style.display=t.canAccessManagerBoard?"":"none");const c=document.querySelector('#mbMenu [data-mbtab="performance"]');c&&(c.style.display=t.canAccessManagerBoard?"":"none");const o=document.querySelector('#mbMenu [data-mbtab="enterprise"]');if(o){const p=t.canUseEnterpriseControls;o.style.display=p?"":"none",o.classList.toggle("hidden",!p)}const d=document.getElementById("mbRestaurantPicker");d&&d.classList.toggle("hidden",!t.canAccessManagerBoard)}function mu(){const e=document.getElementById("btnSetActiveRestaurant");!e||e.__wired||(e.__wired=!0,e.addEventListener("click",async()=>{const n=document.getElementById("selActiveRestaurant")?.value||null;n&&await Eo(n)}))}async function se(e){const t=Array.from(new Set((e||[]).filter(Boolean))),n=new Map;if(!t.length)return n;const r=window.supabase||window.__BC_SUPABASE__;if(!r)return n;const{data:a,error:s}=await r.from("profiles").select("user_id, display_name, role").in("user_id",t).limit(500);if(s)return console.warn("[MB] mapUserIdsToNames failed",s),t.forEach(i=>n.set(i,String(i).slice(0,8))),n;t.forEach(i=>n.set(i,String(i).slice(0,8)));for(const i of a||[]){const l=String(i?.display_name||"").trim();i?.user_id&&l&&n.set(i.user_id,l)}return n}async function _o(){try{const e=window.supabase||window.__BC_SUPABASE__,t=_?.session?.user?.id;if(!e||!t)return;const n=_?.session?.user?.user_metadata?.display_name||_?.session?.user?.user_metadata?.full_name||(_?.session?.user?.email?String(_.session.user.email).split("@")[0]:"")||"",r=String(n||"").trim();if(!r)return;const a=await e.from("profiles").select("display_name").eq("user_id",t).maybeSingle();if(a?.data?.display_name&&String(a.data.display_name).trim())return;const{error:s}=await e.from("profiles").update({display_name:r}).eq("user_id",t);s&&console.warn("[BC] ensureProfileDisplayName failed",s)}catch(e){console.warn("[BC] ensureProfileDisplayName crashed",e)}}function De(e,t){const n=t?.get?.(e);return n&&String(n).trim()?n:String(e||"-").slice(0,8)}const Oe=[{key:"read",label:"READ",color:"#60a5fa"},{key:"framing",label:"FRAME",color:"#34d399"},{key:"delivery",label:"DELIVER",color:"#f59e0b"},{key:"recovery",label:"RECOVER",color:"#f472b6"},{key:"closing",label:"CLOSE",color:"#a78bfa"}];function me(...e){for(const t of e){if(t==null||t==="")continue;const n=Number(t);if(Number.isFinite(n))return n}return null}function pt(...e){for(const t of e){if(t==null)continue;const n=String(t).trim();if(n)return n}return""}function q(e,t=0){const n=Number(e);return Number.isFinite(n)?`${(n<=1?n*100:n).toFixed(t)}%`:"—"}function tt(e,t=1){const n=Number(e);return Number.isFinite(n)?n.toFixed(t):"—"}function wt(e){if(!e)return"—";const t=new Date(e).getTime();if(!Number.isFinite(t))return"—";const n=Date.now()-t,r=Math.abs(n),a=[{label:"d",ms:1440*60*1e3},{label:"h",ms:3600*1e3},{label:"m",ms:60*1e3}];for(const i of a)if(r>=i.ms){const l=Math.round(r/i.ms);return n>=0?`${l}${i.label} ago`:`in ${l}${i.label}`}const s=Math.max(1,Math.round(r/1e3));return n>=0?`${s}s ago`:`in ${s}s`}function Sa(e=[]){const t=Array.isArray(e)?e.slice(0,5):[],n={read:0,framing:0,delivery:0,recovery:0,closing:0};if(!t.length)return n;t.forEach(a=>{n.read+=Number(a?.read_pct||a?.read||0),n.framing+=Number(a?.framing_pct||a?.framing||0),n.delivery+=Number(a?.delivery_pct||a?.delivery||0),n.recovery+=Number(a?.recovery_pct||a?.recovery||0),n.closing+=Number(a?.closing_pct||a?.closing||0)});const r=t.length;return Object.keys(n).forEach(a=>{n[a]=Math.round(n[a]/r)}),n}function Ya(e,t=""){const n=Number(e||0),r=String(t||"").toUpperCase();return r==="STABLE"||n>=.8?"Stable":r==="GROWING"||n>=.62?"Growing":r==="FRAGILE"||n>0?"Fragile":"Unknown"}function za(e={}){const n=Oe.map(({key:r,label:a})=>({key:r,label:a,value:Number(e?.[r]||0)})).slice().sort((r,a)=>a.value-r.value);return{strongestSkill:n[0]?.label||"—",weakestSkill:n[n.length-1]?.label||"—"}}async function kr(){const e=document.getElementById("mbInsightsPanel");if(e){e.innerHTML='<div class="card"><div class="small-text">Loading performance…</div></div>';try{const t=await bn({force:!1});window.__BC_MB_PERFORMANCE_MODEL__=t,window.__BC_MB_SELECTION_MODEL__={...bo(t),restaurantId:t.restaurantId,loadedAt:t.loadedAt||Date.now()},e.innerHTML=`
      <div class="mb-performance-overview card">
        <div class="mb-section-header">
          <strong>Team Performance</strong>
          <div class="small-text">Live performance snapshot for the current restaurant.</div>
        </div>
        <div id="mbPerformanceCards" class="mb-performance-card-grid" style="margin-top:12px;"></div>
      </div>

      <div class="mb-performance-leaderboard card" style="margin-top:12px;">
        <div class="mb-section-header">
          <strong>Performance Leaderboard</strong>
          <div class="small-text">Ranked by total points with quality and readiness context.</div>
        </div>
        <div class="mb-performance-table-wrap" style="margin-top:12px;">
          <table class="mb-performance-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Waiter</th>
                <th>Total Points</th>
                <th>Drill Pass %</th>
                <th>Encounter Pass %</th>
                <th>Challenge Success %</th>
                <th>Premium Success %</th>
                <th>Mastery %</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody id="mbPerformanceRows"></tbody>
          </table>
        </div>
      </div>

      <div class="mb-performance-insights card" style="margin-top:12px;">
        <div class="mb-section-header">
          <strong>Coach Notes</strong>
          <div class="small-text">Quick patterns worth manager attention.</div>
        </div>
        <div id="mbPerformanceCoachNotes" style="margin-top:12px;"></div>
      </div>
    `,fu(t.summary),yu(t.users),hu(t.notes),wu(Object.fromEntries(t.users.map(n=>[n.userId,n])))}catch(t){console.error("[MB] loadManagerInsights failed",t),e.innerHTML=`
      <div class="card">
        <div class="small-text">Failed to load performance.</div>
        <div class="small-text" style="margin-top:6px; opacity:.75;">${y(t?.message||String(t||"Unknown error"))}</div>
      </div>
    `}}}async function Hs(){await kr(),await Ao();const e=document.getElementById("mbHistoryUser");e&&!e.__wired&&(e.__wired=!0,e.addEventListener("change",()=>{Aa(e.value).catch(console.error)})),e?.value?await Aa(e.value):(wo(""),Bo("",[]))}function fo(e){const t=e?.reflection&&typeof e.reflection=="object"?e.reflection:null,n=Array.isArray(e?.chosen_path)?e.chosen_path:Array.isArray(t?.chosenPath)?t.chosenPath:[],r=Array.isArray(e?.best_path)?e.best_path:Array.isArray(t?.bestPath)?t.bestPath:["observe","mode","problem_solve"],a=Array.isArray(e?.step_spine)?e.step_spine:Array.isArray(t?.stepSpine)?t.stepSpine:[],s=Array.isArray(e?.step_reaction_trail)?e.step_reaction_trail:Array.isArray(t?.stepReactionTrail)?t.stepReactionTrail:Array.isArray(t?.reactionHistory)?t.reactionHistory:[],i=e?.chosen_guest_type||"",l=e?.chosen_mode||"",c=e?.chosen_hook||"",o=e?.actual_guest_type||"",d=typeof e?.read_correct=="boolean"?e.read_correct:null,p=typeof e?.delivery_correct=="boolean"?e.delivery_correct:null,m=e?.mode_status||"",g=e?.hook_status||"",u=[`Read: chose ${i||"—"}${d==null?"":d?" and it was correct":" and it was wrong"}.`,`Mode: chose ${l||"—"}${m?` (${m})`:""}.`,`Flash Learn: ${g?`completed (${g})`:"—"}.`,`Deliver: ${p==null?"—":p?"prompt landed correctly":"prompt choice was off"}.`].filter(Boolean).join(" "),f=[`Read: correct guest was ${o||"—"}.`,m?`Mode: target outcome was ${m==="optimal"?"the optimal mode":m}.`:"",g?`Flash Learn: target outcome was ${g==="optimal"?"complete flash learn":g}.`:"",p==null?"":`Deliver: ${p?"the prompt choice was correct":"the prompt needed a stronger guest fit"}.`].filter(Boolean).join(" ");return{userId:e?.user_id||"",occurredAt:e?.occurred_at||null,performanceGrade:e?.performance_grade||"",chainSignal:e?.chain_signal||"",chainScore:e?.chain_score??null,tier:e?.tier??null,aiPerception:e?.ai_perception||t?.aiPerception||"",bottleServed:typeof e?.bottle_served=="boolean"?e.bottle_served:!!t?.bottleServed,chosenGuestType:i,chosenMode:l,chosenHook:c,actualGuestType:o,readCorrect:d,deliveryCorrect:p,modeStatus:m,hookStatus:g,chosenPath:n,bestPath:r,chosenPathExposition:t?.chosenPathExposition||u||"",bestPathExposition:t?.bestPathExposition||f||"",stepSpine:a,stepReactionTrail:s,reactionSummary:e?.reaction_summary&&typeof e.reaction_summary=="object"?e.reaction_summary:null,reflection:t}}async function bn({force:e=!1}={}){const{restaurantId:t}=We();if(!t)return{restaurantId:null,summary:{activeWaiters:0,avgTotalPoints:0,avgDrillPassRate:0,avgEncounterPassRate:0,avgChallengeSuccessRate:0,avgPremiumSuccessRate:0},users:[],notes:["No active restaurant selected."]};const n=window.__BC_MB_PERFORMANCE_MODEL__||null;if(!e&&zi(n,kc,t))return n;const r=new Date(Date.now()-720*60*60*1e3).toISOString(),[a,s,i,l,c,o,d,p,m]=await Promise.all([I.from("profiles").select("user_id, display_name, role").eq("restaurant_id",t).order("display_name",{ascending:!0}),I.from("bc_progression_state_v1").select("user_id, canonical_state, updated_at").eq("restaurant_id",t).order("updated_at",{ascending:!1}).limit(200),I.from("bc_waiter_leaderboard_v1").select("*").eq("restaurant_id",t).order("total_points",{ascending:!1}).order("last_activity_at",{ascending:!1}).limit(200),I.from("bc_readiness_v1").select("*").eq("restaurant_id",t).limit(200),I.from("bc_totals_v1").select("*").eq("restaurant_id",t).limit(200),I.from("bc_user_latest_v1").select("*").eq("restaurant_id",t).order("latest_occurred_at",{ascending:!1}).limit(200),I.from("bc_skill_snapshots_v1").select("user_id, created_at, read_pct, framing_pct, delivery_pct, recovery_pct, closing_pct").eq("restaurant_id",t).order("created_at",{ascending:!1}).limit(2e3),fi({restaurantId:t,sinceIso:r,limit:2e3}),I.from("bc_messages_v1").select("sender_user_id, created_at, type, payload, body").eq("restaurant_id",t).in("type",["drill_completed","timed_challenge_completed","timed_challenge_expired"]).gte("created_at",r).is("archived_at",null).order("created_at",{ascending:!1}).limit(2e3)]);[["profiles",a],["bc_progression_state_v1",s],["bc_waiter_leaderboard_v1",i],["bc_readiness_v1",l],["bc_totals_v1",c],["bc_user_latest_v1",o],["bc_skill_snapshots_v1",d],["bc_encounter_resolutions_v2",p],["bc_messages_v1",m]].forEach(([$,Y])=>{Y?.error&&console.warn(`[MB][PERFORMANCE] ${$} query failed`,Y.error)});const g=Array.isArray(a?.data)?a.data:[],u=Array.isArray(s?.data)?s.data:[],f=Array.isArray(i?.data)?i.data:[],h=Array.isArray(l?.data)?l.data:[],w=Array.isArray(c?.data)?c.data:[],S=Array.isArray(o?.data)?o.data:[],E=Array.isArray(d?.data)?d.data:[],b=Array.isArray(p?.data)?p.data:[],B=Array.isArray(m?.data)?m.data:[];let L=[];try{L=await co(t)}catch($){console.warn("[MB][PERFORMANCE] restaurant environment roster unavailable",$)}const k=new Set,v=new Map,R=new Map;[...g,...L.map($=>({user_id:$?.userId,display_name:$?.displayName,role:$?.role}))].forEach($=>{const Y=String($?.user_id||"");!Y||String($?.role||"").toLowerCase()==="demo"||(k.add(Y),$?.display_name&&v.set(Y,$.display_name),R.set(Y,F($)||String($?.role||"").toLowerCase()||"waiter"))}),[u,f,h,w,S,E,b].forEach($=>{$.forEach(Y=>{const pe=String(Y?.user_id||"");pe&&k.add(pe)})}),B.forEach($=>{const Y=String($?.sender_user_id||"");Y&&k.add(Y)});const A=await se(Array.from(k)),W=new Map;k.forEach($=>{W.set($,pt(v.get($),A.get($),$.slice(0,8)))});const H=($,Y="user_id")=>{const pe=new Map;return $.forEach(ye=>{const Fe=String(ye?.[Y]||"");if(!Fe)return;const _e=pe.get(Fe)||[];_e.push(ye),pe.set(Fe,_e)}),pe},P=H(u),C=H(h),D=H(w),V=H(S),M=H(E),N=H(b),re=H(B,"sender_user_id"),Re=H(f),ge=u.length>0,at=Array.from(k).map($=>{const Y=P.get($)?.[0]||{},pe=Re.get($)?.[0]||{},ye=C.get($)?.[0]||{},Fe=D.get($)?.[0]||{},_e=V.get($)?.[0]||{},Gn=M.get($)||[],Se=N.get($)||[],Wn=Se.slice(0,20).map(X=>fo(X)),st=re.get($)||[],Le=Y?.canonical_state&&typeof Y.canonical_state=="object"?Y.canonical_state:null,Yt=!!Le,it=Le?.economy&&typeof Le.economy=="object"?Le.economy:{},Lt=Le?.authority&&typeof Le.authority=="object"?Le.authority:{},Fn=Number(it?.points),qn=me(Lt?.tierToServe,it?.tier),qe=Number.isFinite(Fn)?Math.max(0,Fn):null,Q=Number.isFinite(qn)?Math.max(1,Math.min(3,Math.round(qn))):null,ie=Sa(Gn),ot=Oe.reduce((X,je)=>X+Number(ie?.[je.key]||0),0),zt=ot/Oe.length,jn=st.filter(X=>String(X?.type||"")==="drill_completed"),lt=st.filter(X=>String(X?.type||"")==="timed_challenge_completed"),_s=st.filter(X=>String(X?.type||"")==="timed_challenge_expired"),Vr=lt.length+_s.length,Kr=jn.filter(X=>{const je=Number(X?.payload?.repsDone||0),zn=Number(X?.payload?.repTarget||0);return zn>0&&je>=zn}).length,il=Se.filter(X=>{const je=String(X?.performance_grade||X?.latest_grade||"").toUpperCase();return je==="A"||je==="B"||String(X?.chain_signal||"").toLowerCase()==="green"||!!X?.is_green}).length,ol=Se.filter(X=>String(X?.performance_grade||"").toUpperCase()==="A").length,ll=lt.filter(X=>!!X?.payload?.premiumSuccess).length,fs=jn.length?Kr/jn.length:0,Yr=Se.length?il/Se.length:0,zr=Vr?lt.length/Vr:0,ys=lt.length?ll/lt.length:0,hs=Se.length?ol/Se.length:zt/100,Vn=me(ye?.readiness_score,ye?.readiness_pct,_e?.readiness_score),cl=(()=>{const X=me(ye?.last10_count,_e?.last10_count),je=me(ye?.last10_greens,_e?.last10_greens),zn=me(ye?.last10_yellows,_e?.last10_yellows);return X&&X>0?Math.max(0,Math.min(1,((je||0)+(zn||0)*.5)/X)):null})(),Kn=pt(ye?.readiness,_e?.readiness),Qt=Math.max(0,Math.min(1,me(Vn!=null?Vn>1?Vn/100:Vn:null,cl,Kn==="STABLE"?.84:null,Kn==="GROWING"?.68:null,Kn==="FRAGILE"?.42:null,zt/100)||0)),Yn=Yt?Math.max(0,qe??0):ge?0:me(pe?.total_points,Fe?.total_points,Fe?.points_total,_e?.total_points,zt/10+lt.length*.9+Kr*.4)||0,dl=pt(Y?.updated_at,pe?.last_activity_at,_e?.latest_occurred_at,Gn[0]?.created_at,Se[0]?.occurred_at,st[0]?.created_at),Jt=Yn>=10||Qt>=.8?3:Yn>=5||Qt>=.62?2:1,ul=Yt?Math.max(1,Math.min(3,Math.round(Q??Jt))):Math.max(1,Math.min(3,Math.round(ge?Jt:me(_e?.latest_tier,pe?.tier_to_serve,pe?.served_tier,Jt)||Jt))),ml=Math.max(0,Math.min(1,Qt*.45+Yr*.35+zr*.2)),ws=ot>0?ie:lo({totalPoints:Yn,drillPassRate:fs,encounterPassRate:Yr,challengeSuccessRate:zr,premiumSuccessRate:ys,masteryRate:hs,readiness:Qt}),bs=za(ws);return{userId:$,displayName:W.get($)||$,role:R.get($)||"waiter",totalPoints:Yn,drillPassRate:fs,drillCompletedCount:jn.length,drillPasses:Kr,encounterPassRate:Yr,encounterCount:Se.length,challengeSuccessRate:zr,challengeCompletedCount:lt.length,challengeExpiredCount:_s.length,challengeCount:Vr,premiumSuccessRate:ys,masteryRate:hs,lastActiveAt:dl,eligibilityTier:Jt,readiness:Qt,readinessLabel:Kn,servedTier:ul,challengeReadiness:ml,percentile:0,strongestSkill:bs.strongestSkill,weakestSkill:bs.weakestSkill,skillShape:ws,encounterSummaries:Wn}}).filter($=>$.displayName).sort(($,Y)=>Y.totalPoints-$.totalPoints||(new Date(Y.lastActiveAt).getTime()||0)-(new Date($.lastActiveAt).getTime()||0)).map(($,Y)=>({...$,rank:Y+1,percentile:k.size?Math.max(0,Math.min(1,(k.size-Y)/k.size)):0}));return{restaurantId:t,loadedAt:Date.now(),summary:pu(at),users:at,notes:_u(at)}}async function gu(e=null,t=null){const n=String(e||"").trim(),r=String(t||"").trim();if(!n&&!r)return[];const a=new Map,s=new Set,i=o=>{const d=F(o);if(!["single_manager","group_manager","enterpriser"].includes(String(d||"").toLowerCase()))return;const p=String(o?.user_id||"");p&&a.set(p,{userId:p,displayName:String(o?.display_name||"").trim()||p.slice(0,8),role:d})},l=(o,d="group_manager")=>{const p=String(o||"").trim();!p||a.has(p)||s.add(`${p}::${d}`)};try{if(n){const o=await Z(I.from("profiles").select("user_id, display_name, role").eq("restaurant_id",n).order("display_name",{ascending:!0}),12e3,"profiles.associated_managers.restaurant");o?.error||(o.data||[]).forEach(i)}}catch(o){console.warn("[LEADERBOARD] associated manager restaurant query failed",o)}try{if(r){const o=await Z(I.from("profiles").select("user_id, display_name, role, scope_id").eq("scope_id",r).order("display_name",{ascending:!0}),12e3,"profiles.associated_managers.scope");o?.error||(o.data||[]).forEach(i)}}catch(o){console.warn("[LEADERBOARD] associated manager scope query failed",o)}const c=String(_?.restaurant?.id||"")===n?String(_?.restaurant?.created_by||"").trim():"";if(c&&l(c,"group_manager"),n)try{const o=await Z(I.from("bc_messages_v1").select("sender_user_id, sender_role").eq("restaurant_id",n).in("sender_role",["single_manager","group_manager","enterpriser","manager","enterprise_admin"]).is("archived_at",null).order("created_at",{ascending:!1}).limit(200),12e3,"messages.associated_managers");o?.error||(o.data||[]).forEach(d=>{l(d?.sender_user_id,F(d?.sender_role||"group_manager"))})}catch(o){console.warn("[LEADERBOARD] associated manager message query failed",o)}if(s.size){const o=Array.from(s).map(p=>p.split("::")[0]).filter(Boolean),d=await se(o);for(const p of o){const m=String(d.get(p)||"").trim();if(!(m&&m!==String(p).slice(0,8)))try{const g=await $n(p),u=String(g?.display_name||"").trim();u&&d.set(p,u)}catch(g){console.warn("[LEADERBOARD] direct manager profile lookup failed",{userId:p,error:g})}}Array.from(s).forEach(p=>{const[m,g]=p.split("::");!m||a.has(m)||a.set(m,{userId:m,displayName:String(d.get(m)||"").trim()||"Manager",role:F(g||"group_manager")})})}return Array.from(a.values()).sort((o,d)=>String(o.displayName||"").localeCompare(String(d.displayName||"")))}function pu(e=[]){const t=n=>e.length?e.reduce((r,a)=>r+Number(n(a)||0),0)/e.length:0;return{activeWaiters:e.filter(n=>!!n.lastActiveAt).length,avgTotalPoints:t(n=>n.totalPoints),avgDrillPassRate:t(n=>n.drillPassRate),avgEncounterPassRate:t(n=>n.encounterPassRate),avgChallengeSuccessRate:t(n=>n.challengeSuccessRate),avgPremiumSuccessRate:t(n=>n.premiumSuccessRate)}}function _u(e=[]){if(!e.length)return["No performance data yet."];const t=[],n=e.filter(i=>i.drillPassRate>=.75&&i.encounterPassRate<.6),r=e.filter(i=>i.totalPoints>=8&&i.challengeSuccessRate<.5),a=e.filter(i=>i.premiumSuccessRate>=.4),s=e.slice().sort((i,l)=>i.challengeReadiness-l.challengeReadiness).slice(0,2);return n.length&&t.push(`${n.length} waiter(s) convert drills better than live encounters.`),r.length&&t.push(`${r.length} high-point waiter(s) still need cleaner challenge execution.`),a.length&&t.push(`${a.length} waiter(s) are consistently converting premium moments.`),s.length&&t.push(`Focus next coaching on ${s.map(i=>i.displayName).join(" and ")}.`),t.slice(0,4)}function fu(e={}){const t=document.getElementById("mbPerformanceCards");if(!t)return;const n=[["Active Waiters",e.activeWaiters??0],["Avg Total Points",tt(e.avgTotalPoints,1)],["Avg Drill Pass Rate",q(e.avgDrillPassRate)],["Avg Encounter Pass Rate",q(e.avgEncounterPassRate)],["Avg Challenge Success Rate",q(e.avgChallengeSuccessRate)],["Avg Premium Success Rate",q(e.avgPremiumSuccessRate)]];t.innerHTML=n.map(([r,a])=>`
    <div class="mb-performance-card">
      <div class="small-text">${y(r)}</div>
      <strong>${y(String(a))}</strong>
    </div>
  `).join("")}function yu(e=[]){const t=document.getElementById("mbPerformanceRows");t&&(t.innerHTML=e.map(n=>`
    <tr class="mb-user-row" data-user-id="${y(n.userId)}">
      <td>${n.rank}</td>
      <td>
        <button
          type="button"
          class="mb-user-expand-btn"
          data-user-id="${y(n.userId)}"
          aria-expanded="false"
        >
          <span class="mb-chevron">▶</span>
          <span class="mb-user-avatar">${y((n.displayName||"?").slice(0,2).toUpperCase())}</span>
          <span class="mb-user-name">${y(n.displayName||"Unknown")}</span>
        </button>
      </td>
      <td>${tt(n.totalPoints,1)}</td>
      <td>${q(n.drillPassRate)}</td>
      <td>${q(n.encounterPassRate)}</td>
      <td>${q(n.challengeSuccessRate)}</td>
      <td>${q(n.premiumSuccessRate)}</td>
      <td>${q(n.masteryRate)}</td>
      <td>${wt(n.lastActiveAt)}</td>
    </tr>
    <tr class="mb-user-detail-row hidden" data-user-detail-id="${y(n.userId)}">
      <td colspan="9">
        <div class="mb-user-detail-panel">
          <div class="mb-user-detail-left">
            <div class="mb-user-detail-chart-card">
              <div class="small-text" style="margin-bottom:8px;">Current Skill Shape</div>
              <canvas id="mbUserSkillPie_${y(n.userId)}" class="mb-user-skill-pie" width="240" height="240"></canvas>
              <div id="mbUserSkillLegend_${y(n.userId)}" style="margin-top:12px;"></div>
            </div>
          </div>
          <div class="mb-user-detail-right">
            <div class="mb-user-metric-grid">
              <div class="mb-user-metric-card"><div class="small-text">Total Points</div><strong>${tt(n.totalPoints,1)}</strong></div>
              <div class="mb-user-metric-card"><div class="small-text">Eligibility Tier</div><strong>T${n.eligibilityTier}</strong></div>
              <div class="mb-user-metric-card"><div class="small-text">Readiness</div><strong>${q(n.readiness)}</strong></div>
              <div class="mb-user-metric-card"><div class="small-text">Drill Pass</div><strong>${q(n.drillPassRate)}</strong></div>
              <div class="mb-user-metric-card"><div class="small-text">Encounter Pass</div><strong>${q(n.encounterPassRate)}</strong></div>
              <div class="mb-user-metric-card"><div class="small-text">Challenge Success</div><strong>${q(n.challengeSuccessRate)}</strong></div>
              <div class="mb-user-metric-card"><div class="small-text">Premium Success</div><strong>${q(n.premiumSuccessRate)}</strong></div>
              <div class="mb-user-metric-card"><div class="small-text">Mastery</div><strong>${q(n.masteryRate)}</strong></div>
              <div class="mb-user-metric-card"><div class="small-text">Last Active</div><strong>${y(wt(n.lastActiveAt))}</strong></div>
            </div>
            <div class="mb-user-badge-row" style="margin-top:12px;">
              <span class="mb-badge">Strongest: ${y(n.strongestSkill||"—")}</span>
              <span class="mb-badge">Weakest: ${y(n.weakestSkill||"—")}</span>
              <span class="mb-badge">${y(n.challengeReadiness>=.7?"Challenge Ready":"Needs Build-Up")}</span>
              <span class="mb-badge">Readiness: ${y(Ya(n.readiness,n.readinessLabel))}</span>
            </div>
          </div>
        </div>
      </td>
    </tr>
  `).join(""))}function hu(e=[]){const t=document.getElementById("mbPerformanceCoachNotes");t&&(t.innerHTML=e.length?e.map(n=>`<div class="mb-coach-note">${y(String(n||""))}</div>`).join(""):'<div class="small-text">No coach notes yet.</div>')}function wu(e={}){document.querySelectorAll(".mb-user-expand-btn").forEach(t=>{t.__wired||(t.__wired=!0,t.addEventListener("click",async()=>{await bu(t.dataset.userId,e)}))})}async function bu(e,t={}){const n=document.querySelector(`.mb-user-expand-btn[data-user-id="${CSS.escape(String(e||""))}"]`),r=document.querySelector(`.mb-user-detail-row[data-user-detail-id="${CSS.escape(String(e||""))}"]`);if(!n||!r)return;if(!r.classList.contains("hidden")){r.classList.add("hidden"),n.classList.remove("is-open"),n.setAttribute("aria-expanded","false");return}vu(e),r.classList.remove("hidden"),n.classList.add("is-open"),n.setAttribute("aria-expanded","true");const s=t?.[e],i=document.getElementById(`mbUserSkillPie_${e}`),l=document.getElementById(`mbUserSkillLegend_${e}`);i&&s&&!i.__drawn&&(yo(i,s.skillShape,{centerTop:`T${s.eligibilityTier||1}`,centerBottom:`${Math.round(Number(s.readiness||0)*100)}%`}),i.__drawn=!0),l&&s&&ho(l,s.skillShape,{strongestSkill:s.strongestSkill,weakestSkill:s.weakestSkill})}function vu(e=null){document.querySelectorAll(".mb-user-detail-row").forEach(t=>{e&&t.dataset.userDetailId===e||t.classList.add("hidden")}),document.querySelectorAll(".mb-user-expand-btn").forEach(t=>{e&&t.dataset.userId===e||(t.classList.remove("is-open"),t.setAttribute("aria-expanded","false"))})}function yo(e,t,n={}){if(!e)return;const r=e.getContext("2d"),a=e.width,s=e.height,i=a/2,l=s/2,c=Math.min(a,s)*.28;r.clearRect(0,0,a,s),r.lineWidth=26,r.lineCap="round";const o=Oe.map(m=>({...m,value:Math.max(0,Number(t?.[m.key]||0))})),d=o.reduce((m,g)=>m+g.value,0);if(!d){r.fillStyle="rgba(255,255,255,0.72)",r.font="13px sans-serif",r.textAlign="center",r.fillText("No skill data",i,l);return}let p=-Math.PI/2;o.forEach(m=>{const g=p+m.value/d*Math.PI*2;r.beginPath(),r.strokeStyle=m.color,r.arc(i,l,c,p,g),r.stroke(),p=g}),r.fillStyle="rgba(4,7,12,0.9)",r.beginPath(),r.arc(i,l,c-22,0,Math.PI*2),r.fill(),r.fillStyle="#fff",r.textAlign="center",r.font="bold 18px sans-serif",r.fillText(String(n.centerTop||""),i,l-4),r.font="12px sans-serif",r.fillText(String(n.centerBottom||""),i,l+16)}function ho(e,t={},n={}){if(!e)return;const r=String(n?.strongestSkill||"").toUpperCase(),a=String(n?.weakestSkill||"").toUpperCase();e.innerHTML=`
    <div style="display:flex; flex-direction:column; gap:8px;">
      ${Oe.map(s=>{const i=Math.max(0,Number(t?.[s.key]||0)),l=r&&r===String(s.label||"").toUpperCase(),c=a&&a===String(s.label||"").toUpperCase(),o=l?"Strongest":c?"Weakest":"";return`
          <div style="display:grid; grid-template-columns:auto 1fr auto auto; gap:8px; align-items:center;">
            <span style="width:10px; height:10px; border-radius:999px; background:${y(s.color)};"></span>
            <span class="small-text" style="opacity:.92;">${y(s.label)}</span>
            <span class="small-text" style="opacity:.82;">${y(String(i))}%</span>
            <span class="small-text" style="opacity:.7; min-width:56px; text-align:right;">${y(o)}</span>
          </div>
        `}).join("")}
    </div>
  `}function wo(e){const t=document.getElementById("mbHistorySummaryStrip"),n=window.__BC_MB_PERFORMANCE_MODEL__||null;if(!t)return;const r=n?.users?.find(a=>String(a.userId)===String(e||""));if(!r){t.innerHTML="";return}t.innerHTML=`
    <div class="mb-history-summary-strip">
      <span class="mb-badge">${y(r.displayName)}</span>
      <span class="mb-badge">Points: ${tt(r.totalPoints,1)}</span>
      <span class="mb-badge">Readiness: ${q(r.readiness)}</span>
      <span class="mb-badge">Mastery: ${q(r.masteryRate)}</span>
      <span class="mb-badge">Last Active: ${y(wt(r.lastActiveAt))}</span>
    </div>
  `}function bo(e){const n=(Array.isArray(e?.users)?e.users:[]).map(r=>{const a=r.eligibilityTier>=3&&r.challengeReadiness>=.74?"Eligible":r.eligibilityTier>=2&&r.challengeReadiness>=.62?"Reserve":"Hold";return{userId:r.userId,displayName:r.displayName,eligibilityTier:r.eligibilityTier,readiness:r.readiness,servedTier:r.servedTier,challengeReadiness:r.challengeReadiness,pointsRank:r.rank,selectionStatus:a,selectionReason:a==="Eligible"?"High readiness with stable encounter quality and challenge execution.":a==="Reserve"?"Close to selection line but still needs cleaner consistency.":"Hold back until readiness and recency improve.",lastActiveAt:r.lastActiveAt}});return{summary:{tier3EligibleCount:n.filter(r=>r.eligibilityTier===3).length,tier2EligibleCount:n.filter(r=>r.eligibilityTier===2).length,borderlineCount:n.filter(r=>r.selectionStatus==="Reserve").length,notEligibleCount:n.filter(r=>r.selectionStatus==="Hold").length},rows:n,preview:{recommended:n.filter(r=>r.selectionStatus==="Eligible").map(r=>r.userId),reserves:n.filter(r=>r.selectionStatus==="Reserve").map(r=>r.userId),hold:n.filter(r=>r.selectionStatus==="Hold").map(r=>r.userId)}}}async function Ea(){const e=document.getElementById("mbSelectionPanel");if(e){e.innerHTML='<div class="card"><div class="small-text">Loading selection…</div></div>';try{const{restaurantId:t}=We(),n=window.__BC_MB_SELECTION_MODEL__||null;if(zi(n,Nc,t)){const s=window.__BC_MB_PERFORMANCE_MODEL__||await bn({force:!1});Gs(e,n,s.users);return}const r=await bn({force:!1});window.__BC_MB_PERFORMANCE_MODEL__=r;const a={...bo(r),restaurantId:r.restaurantId,loadedAt:Date.now()};window.__BC_MB_SELECTION_MODEL__=a,Gs(e,a,r.users)}catch(t){console.error("[MB] loadSelectionTab failed",t),e.innerHTML=`
      <div class="card">
        <div class="small-text">Failed to load selection.</div>
        <div class="small-text" style="margin-top:6px; opacity:.75;">${y(t?.message||String(t||"Unknown error"))}</div>
      </div>
    `}}}function Su(e={}){const t=document.getElementById("mbSelectionCards");if(!t)return;const n=[["Eligible Tier 3",e.tier3EligibleCount??0],["Eligible Tier 2",e.tier2EligibleCount??0],["Borderline",e.borderlineCount??0],["Not Eligible",e.notEligibleCount??0]];t.innerHTML=n.map(([r,a])=>`
    <div class="mb-performance-card">
      <div class="small-text">${y(r)}</div>
      <strong>${y(String(a))}</strong>
    </div>
  `).join("")}function Gs(e,t,n){e&&(e.innerHTML=`
    <div class="mb-selection-overview card">
      <div class="mb-section-header">
        <strong>Tournament Setup & Selection</strong>
        <div class="small-text">Qualification, readiness, and selection guidance.</div>
      </div>
      <div id="mbSelectionCards" class="mb-performance-card-grid" style="margin-top:12px;"></div>
    </div>

    <div class="mb-selection-table-wrap card" style="margin-top:12px;">
      <div class="mb-section-header">
        <strong>Selection Table</strong>
        <div class="small-text">Use readiness and eligibility to identify tournament candidates.</div>
      </div>
      <div class="mb-performance-table-wrap" style="margin-top:12px;">
        <table class="mb-performance-table mb-selection-table">
          <thead>
            <tr>
              <th>Waiter</th>
              <th>Eligibility Tier</th>
              <th>Readiness</th>
              <th>Served Tier</th>
              <th>Challenge Readiness</th>
              <th>Points Rank</th>
              <th>Selection Status</th>
              <th>Selection Reason</th>
              <th>Last Active</th>
            </tr>
          </thead>
          <tbody id="mbSelectionRows"></tbody>
        </table>
      </div>
    </div>

    <div class="mb-selection-preview card" style="margin-top:12px;">
      <div class="mb-section-header">
        <strong>Auto-Select Preview</strong>
        <div class="small-text">Recommended cohort, reserves, and hold list.</div>
      </div>
      <div id="mbSelectionPreview" style="margin-top:12px;"></div>
    </div>
  `,Su(t.summary),Eu(t.rows),Ru(t.preview,n))}function Eu(e=[]){const t=document.getElementById("mbSelectionRows");t&&(t.innerHTML=e.map(n=>`
    <tr>
      <td>${y(n.displayName||"Unknown")}</td>
      <td>T${n.eligibilityTier||1}</td>
      <td>${q(n.readiness)}</td>
      <td>T${n.servedTier||1}</td>
      <td>${q(n.challengeReadiness)}</td>
      <td>#${n.pointsRank||"—"}</td>
      <td><span class="mb-badge">${y(n.selectionStatus||"Hold")}</span></td>
      <td>${y(n.selectionReason||"—")}</td>
      <td>${y(wt(n.lastActiveAt))}</td>
    </tr>
  `).join(""))}function Ru(e={},t=[]){const n=document.getElementById("mbSelectionPreview");if(!n)return;const r=s=>t.find(i=>String(i.userId)===String(s))?.displayName||String(s||"—"),a=[["Recommended Cohort",e.recommended||[]],["Reserve List",e.reserves||[]],["Held Back",e.hold||[]]];n.innerHTML=`
    <div class="mb-selection-preview-grid">
      ${a.map(([s,i])=>`
        <div class="mb-selection-preview-card">
          <div style="font-weight:600;">${y(s)}</div>
          <div class="small-text" style="margin-top:8px;">
            ${i.length?i.map(l=>`<div style="padding:4px 0;">${y(r(l))}</div>`).join(""):"<div>No users</div>"}
          </div>
        </div>
      `).join("")}
    </div>
  `}async function vo(){const e=document.getElementById("selActiveRestaurant"),t=document.getElementById("activeRestaurantHint");if(!e)return;e.innerHTML="",t&&(t.textContent="Loading restaurants…");const n=await I.from("restaurants").select("id, name").order("name",{ascending:!0});if(n.error){console.error("[BC] restaurants fetch failed",n.error),t&&(t.textContent=`⚠️ Failed to load restaurants: ${n.error.message}`);return}const r=n.data||[];if(!r.length){t&&(t.textContent="⚠️ No restaurants found.");return}for(const l of r){const c=document.createElement("option");c.value=l.id,c.textContent=l.name||l.id.slice(0,8)+"…",e.appendChild(c)}const a=(typeof Qe=="function"?Qe(_?.profile?.scope_id||null):null)||localStorage.getItem("BC_ACTIVE_RESTAURANT_ID")||null,s=_.activeRestaurantId||a||r[0].id;e.value=s,_.activeRestaurantId=s,window.__BC_ALLOWED_RESTAURANT_IDS__=r.map(l=>String(l.id||"")).filter(Boolean),Gt(_?.profile?.scope_id||null,s),localStorage.setItem("BC_ACTIVE_RESTAURANT_ID",s),window.__BC_ACTIVE_MANAGER_RESTAURANT_ID__=s,window.__BC_ACTIVE_RESTAURANT_ID__=s;const i=r.find(l=>l.id===s)||null;return i&&!_.restaurant&&(_.restaurant=i),Ir(),t&&(t.textContent=`✅ Active: ${i?.name||String(s).slice(0,8)+"…"}`),console.log("[BC] picker hydrated (no scope)",{active:s}),r}async function So(e,t){const n=String(e||""),r=String(t||"");if(!n||!r)return!1;const{data:a,error:s}=await I.from("bc_scope_restaurants").select("restaurant_id").eq("scope_id",n).eq("restaurant_id",r).maybeSingle();if(s)throw s;return!!a}async function Iu(e){const t=String(e?.role||"").toLowerCase(),n=String(e?.scope_type||"").toLowerCase(),r=e?.scope_id||null;if(n!=="group"&&n!=="enterprise")return e?.restaurant_id||null;if(!Ue(t)||!r)return null;let a=null;try{a=Qe(r)}catch{}if(a)try{if(await So(r,a))return a;try{localStorage.removeItem(Sr(r))}catch{}a=null}catch{return a}const{data:s,error:i}=await I.from("bc_scope_restaurants").select("restaurant_id").eq("scope_id",r).order("created_at",{ascending:!0}).limit(1);if(i)return console.warn("[BC] resolveInitialRestaurantForScope failed",i),null;const l=s?.[0]?.restaurant_id||null;if(!l)return null;try{Gt(r,l)}catch{}return l}function Cu(e="manual"){const t=document.querySelector("#premiumRoot iframe")||document.getElementById("premiumRootFrame");if(!t||!t.contentWindow)return;const n=ue("premium"),r=Number(n.epoch||t.dataset?.bcEpoch||0),a={source:"BC_MSG",v:1,type:"bc_ctx",mode:"premium",userId:n.userId,profileUserId:n.profileUserId,progressionOwnerUserId:n.progressionOwnerUserId,progressionOwnerRestaurantId:n.progressionOwnerRestaurantId,restaurantId:n.restaurantId,scopeId:n.scopeId,scopeType:n.scopeType,accessTier:n.accessTier,membershipRole:n.membershipRole,membership_role:n.membership_role,role:n.role,gameplayRole:n.gameplayRole,gameplay_role:n.gameplay_role,epoch:r,_from:e};t.contentWindow.postMessage(a,window.location.origin);try{setSourceCtx(t.contentWindow,a),window.__BC_LAST_SOURCE_CTX__={...a,at:Date.now()}}catch{}}async function Ws(e="manual"){const t=ue("premium"),n=t.progressionOwnerUserId||t.profileUserId||t.userId||null,r=t.progressionOwnerRestaurantId||t.restaurantId||null;if(!n||!r)return!1;try{return await Rr({userId:n,restaurantId:r}),console.log("[BC] premium iframe progression hydrated",{source:e,userId:n,restaurantId:r}),!0}catch(a){return console.warn("[BC] premium iframe progression hydrate failed",{source:e,userId:n,restaurantId:r,error:a?.message||a}),!1}}function Ra(e="manual",t=0){return!document.getElementById("premiumRootFrame")?.contentWindow||!_?.session||oe?.()||xt?.()?!1:cn()?!0:!ln("premium")||(Cu(`${e}#${t}`),t>=7)?!1:(window.setTimeout(()=>{try{Ra(e,t+1)}catch{}},250*(t+1)),!0)}function Fs(e,t={}){try{if(oe?.()||xt?.()||!ue("premium").session)return!1;const n=document.getElementById("premiumRootFrame")||document.getElementById("bcPremiumFrame");if(!n||!n.contentWindow)return!1;const r=String(n.getAttribute("src")||"");try{const i=new URL(r,window.location.origin);if(i.origin!==window.location.origin)return console.warn("[PARENT] post blocked (iframe not same-origin)",{type:e,src:i.origin}),!1}catch{}const a=Number(window.__BC_IFRAME_EPOCH__||0),s=Number(n.dataset?.bcEpoch||0);return!a||s&&s!==a?(console.warn("[PARENT] post blocked (epoch mismatch)",{type:e,frameEpoch:s,currentEpoch:a}),!1):(n.contentWindow.postMessage({source:"BC_MSG",v:1,type:e,...t,epoch:a},window.location.origin),!0)}catch(n){return console.warn("[PARENT] postToPremiumIframeSafe failed",e,n),!1}}function qs(){const e=Number(window.__BC_IFRAME_EPOCH__||0);if(oe?.()||xt?.()||!window.appState?.session||!e)return;!window.__BC_DRILL_CONFIG__&&window.setDefaultDrillConfig&&window.setDefaultDrillConfig();const t=window.__BC_DRILL_CONFIG__||window.BC_DRILL_CONFIG||null;if(!Fs("drill_config",{drill:t,epoch:e}))return;const r=window.__BC_PENDING_START_DRILL__||window.BC_PENDING_START_DRILL;if(r?.__epoch&&r.__epoch!==e){console.warn("[DRILL] pending drill dropped (stale epoch)",r),Ht();return}r&&Fs("start_drill",{...r,epoch:e})&&Ht()}function Wt({showBack:e=!1,backTo:t="screenManagerBoard",mode:n="premium",url:r=null,forceRemount:a=!1}={}){if(oe()){console.warn("[BC] premium mount blocked: hard logged out");return}const s=document.getElementById("premiumRoot");let i=document.getElementById("premiumRootFrame");if(!s&&!i)return;const c=String(i?.getAttribute("src")||"").includes("/game/game.html");if(i&&!a&&c){if(oe())return;ln(n||"premium")&&Ws("mount.existing").finally(()=>{Ra("mount.existing")}),qs();return}if(i&&a&&s)try{i.remove()}catch{}if(s)s.innerHTML="",i=document.createElement("iframe"),i.id="premiumRootFrame";else if(!i)return;const o=String(_?.profile?.role||"").toLowerCase();o==="waiter"&&_?.profile&&At({user_id:_.profile.user_id||null,restaurant_id:_.profile.restaurant_id||null});const d=o==="waiter"?"screenPremiumApp":t||"screenManagerBoard";window.__BC_IFRAME_EPOCH__=Date.now();const p=window.__BC_IFRAME_EPOCH__,m=p;window.__BC_SOURCE_CTX_MAP__=new WeakMap,window.__BC_PENDING_CTX_REQ__=null,i.dataset.bcEpoch=String(p),i.src=tu({mode:n||"premium",showBack:!!e,backTo:d,urlOverride:r||null,epoch:p,bustCache:!0}),i.style.width="100%",i.style.height="78vh",i.style.border="0",i.style.position="relative",i.style.zIndex="1",i.style.pointerEvents="auto",i.addEventListener("load",()=>{(async()=>{if(Number(window.__BC_IFRAME_EPOCH__||0)!==m){console.warn("[PARENT] ignored iframe load (stale epoch)",{myEpoch:m,current:window.__BC_IFRAME_EPOCH__});return}if(xt())return;const g=await dr();if(!g)return;_.session=g;const u=String(new URL(i.src,window.location.href).searchParams.get("mode")||"").toLowerCase();if(u!=="demo"){try{ln(u||"premium")&&(await Ws("iframe.load"),Ra("iframe.load"))}catch(f){console.warn("[PARENT] bc_ctx push on iframe load failed",f)}qs(),console.log("[PARENT] premium iframe loaded ✅ (ctx/drill pushed)",{epoch:m})}})()}),s&&(s.style.pointerEvents="auto",s.appendChild(i)),console.log("[BC] mounted premium iframe",{src:i.src,epoch:p})}async function Eo(e){const t=_.profile||{},n=String(t.role||"").toLowerCase(),r=String(t.scope_type||"").toLowerCase(),a=t.scope_id||null;if(!Ue(n))throw new Error("Only managers can switch restaurants.");if(!a)throw new Error("Missing scope_id on profile.");if(r!=="group"&&r!=="enterprise")throw new Error("Restaurant switching only allowed for group/enterprise scopes.");if(!e)throw new Error("No restaurant selected.");if(jc(),window.__BC_SWITCHING_RESTAURANT__)return;window.__BC_SWITCHING_RESTAURANT__=!0;const s={activeRestaurantId:_.activeRestaurantId||null,restaurant:_.restaurant||null,stored:null},i=document.getElementById("btnSetActiveRestaurant"),l=document.getElementById("selActiveRestaurant");try{i&&(i.disabled=!0),l&&(l.disabled=!0)}catch{}try{if(!await So(a,e))throw new Error("Restaurant not allowed for this scope.");_.activeRestaurantId=e,window.__BC_ACTIVE_MANAGER_RESTAURANT_ID__=e,window.__BC_ACTIVE_RESTAURANT_ID__=e;try{s.stored=Qe(a),Gt(a,e)}catch{}const o=document.getElementById("activeRestaurantHint");o&&(o.textContent=`Active: ${String(e).slice(0,8)}…`);const d=await et(e);_.restaurant=d,Ir(),Pa(),window.__BC_APP_STATE__=window.__BC_APP_STATE__||{},window.__BC_APP_STATE__.restaurant=d,console.log("[BC] active restaurant set (group/enterprise)",{scopeId:a,restaurantId:e,restaurant:d?{id:d.id,name:d.name}:null});try{(!document.getElementById("screenPlay")?.classList.contains("hidden")||!document.getElementById("screenPremiumApp")?.classList.contains("hidden"))&&Wt()}catch{}}catch(c){_.activeRestaurantId=s.activeRestaurantId,_.restaurant=s.restaurant;try{s.activeRestaurantId?Gt(a,s.activeRestaurantId):localStorage.removeItem(Sr(_?.profile?.scope_id||null))}catch{}const o=document.getElementById("activeRestaurantHint");throw o&&(o.textContent=s.activeRestaurantId?`Active: ${String(s.activeRestaurantId).slice(0,8)}…`:""),console.error("[BC] setActiveRestaurantForGroup failed (rolled back)",c),c}finally{window.__BC_SWITCHING_RESTAURANT__=!1;try{i&&(i.disabled=!1),l&&(l.disabled=!1)}catch{}}}async function Ia(){const e=_.profile||{},t=String(e.scope_type||"").toLowerCase();if(t==="group"||t==="enterprise"){if(!(window.getActiveRestaurantId?.()||null))throw new Error("Active restaurant not set.")}else if(!e.restaurant_id)throw new Error("Profile missing restaurant_id.")}function We(){const e=ue("premium"),t=e.profile||{},n=J(t),r=j()||e.activeRestaurantId||null;return{role:F(t),caps:n,isManager:!!n.canAccessManagerBoard,restaurantId:r,canAct:!!r&&Me(t,t,r),parentSnapshot:e}}function Qa(e=null){const t=String(e||j()||"");if(!t)throw new Error("Active restaurant not set.");return t}function vn(){window.__BC_MB_MESSAGES__=[],window.__BC_MESSENGER_ROWS__=[],window.__BC_MB_THREADS__=[],window.__BC_MB_INVITES__=[],window.__BC_MB_STAFF_ROWS__=[],window.__BC_MB_TIMED_CHALLENGE_ROWS__=[],window.__BC_MB_LAST_TIMED_CHALLENGE_RESULT__=null,window.__BC_MB_LAST_DRILL_ASSIGNMENT__=null,window.__BC_MB_LAST_DRILL_COMPLETION__=null,window.__BC_GROUP_MANAGER_METRICS__=null,window.__BC_GROUP_RESTAURANT_COMPARISON_ROWS__=[]}function Sn(e){window.__BC_MB_INVITES__=Array.isArray(e)?e:[]}function Ja(){return Array.isArray(window.__BC_MB_INVITES__)?window.__BC_MB_INVITES__:[]}function Un(){return Array.isArray(window.__BC_ALLOWED_RESTAURANT_ROWS__)?window.__BC_ALLOWED_RESTAURANT_ROWS__:[]}function Tu(){return Array.isArray(window.__BC_ALLOWED_RESTAURANT_IDS__)?window.__BC_ALLOWED_RESTAURANT_IDS__:[]}function Nr(e){const t=String(e||"");if(!t)return"-";const n=Un().find(r=>String(r?.id||r?.restaurant_id||"")===t);return n?.name||n?.restaurant_name||`Restaurant ${t.slice(0,8)}`}function pr(){let e=document.getElementById("mbParentStateCard");if(!e){const s=document.getElementById("mbTab_overview");if(!s)return;e=document.createElement("div"),e.id="mbParentStateCard",e.style.marginBottom="12px",s.prepend(e)}if(!e)return;e.style.display="block",e.style.visibility="visible",e.style.opacity="1",e.style.position="relative",e.style.zIndex="1";const t=ue("premium"),n=cn(),r=t.ctxReady?n?"ready":"degraded_iframe":"degraded_parent_ctx",a=r==="ready"?{border:"rgba(62, 184, 122, 0.38)",bg:"linear-gradient(180deg, rgba(18,52,35,0.96), rgba(14,30,24,0.96))",badgeBg:"rgba(62, 184, 122, 0.18)",badgeText:"#b8f1cf"}:{border:"rgba(232, 170, 64, 0.42)",bg:"linear-gradient(180deg, rgba(58,36,12,0.96), rgba(34,23,10,0.96))",badgeBg:"rgba(232, 170, 64, 0.18)",badgeText:"#ffe1a8"};e.innerHTML=`
    <div class="card" style="padding:12px; display:flex; flex-direction:column; gap:8px; border:1px solid ${a.border}; background:${a.bg}; box-shadow:0 10px 28px rgba(0,0,0,0.18);">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <strong>Parent State</strong>
        <span class="small-text" style="opacity:.95; padding:3px 8px; border-radius:999px; background:${a.badgeBg}; color:${a.badgeText}; text-transform:uppercase; letter-spacing:.04em;">${y(r)}</span>
      </div>
      <div class="small-text" style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px 12px;">
        <div><b>Role:</b> ${y(t.membershipRole||"-")}</div>
        <div><b>Restaurant:</b> ${y(t.activeRestaurantId||"-")}</div>
        <div><b>Ctx Ready:</b> ${t.ctxReady?"Yes":"No"}</div>
        <div><b>Iframe Healthy:</b> ${n?"Yes":"No"}</div>
        <div><b>Epoch:</b> ${y(String(t.epoch||0))}</div>
        <div><b>User:</b> ${y(t.userId||"-")}</div>
      </div>
    </div>
  `}window.renderParentStateDebugCard=pr;function Ro(){const e=Array.isArray(window.__BC_MB_STAFF_ROWS__)?window.__BC_MB_STAFF_ROWS__:[],t=String(_?.session?.user?.id||_?.session?.userId||"");return e.length?e.map(n=>{const r=String(n?.role||"").toLowerCase(),a=String(n?.user_id||"").trim();if(!a||r==="demo")return null;const i=String(n?.display_name||"").trim()||a;return{userId:a,label:t&&a===t?`${i} (you)`:i}}).filter(n=>n?.userId).sort((n,r)=>String(n.label||"").localeCompare(String(r.label||""))):Fo()}function Au(e,t={}){if(!e)return;const n=Ro(),r=String(t.placeholder||"Select staff member"),a=String(t.selectedUserId||window.__BC_MB_RITUAL_STATUS_USER_ID__||window.__BC_MB_ACTIVE_THREAD_USER_ID__||""),s=[`<option value="">${y(r)}</option>`,...n.map(i=>{const l=a&&String(i.userId)===a?"selected":"";return`<option value="${y(i.userId)}" ${l}>${y(i.label)}</option>`})];e.innerHTML=s.join("")}function sa(){const e=new Date,t=new Date(e.toLocaleString("en-US",{timeZone:"Africa/Johannesburg"})),n=new Date(t);return n.setHours(0,0,0,0),n.toISOString()}async function Bu({userId:e,restaurantId:t}={}){const n=String(e||"").trim(),r=String(t||j()||"").trim();if(!n||!r)return{ok:!1,doneToday:!1,error:"missing_target",latestOccurredAt:null,windowStartIso:null};const{data:a,error:s}=await I.from("bc_event_log").select("occurred_at").eq("event_type","ritual_completed").eq("user_id",n).eq("restaurant_id",r).gte("occurred_at",sa()).order("occurred_at",{ascending:!1}).limit(1);if(s)return{ok:!1,doneToday:!1,error:s.message||String(s),latestOccurredAt:null,windowStartIso:sa()};const i=Array.isArray(a)&&a.length&&a[0]?.occurred_at||null;return{ok:!0,doneToday:!!i,latestOccurredAt:i,windowStartIso:sa()}}async function _r(e={}){const t=document.getElementById("mbOverviewRitualStatus");if(!t)return;const n=String(j()||_?.activeRestaurantId||_?.profile?.restaurant_id||""),r=Ro(),a=String(window.__BC_MB_RITUAL_STATUS_USER_ID__||window.__BC_MB_ACTIVE_THREAD_USER_ID__||r[0]?.userId||""),s=String(e.selectedUserId||a||"");if(window.__BC_MB_RITUAL_STATUS_USER_ID__=s,!r.length){t.innerHTML=`
      <div class="card" style="padding:12px; display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <strong>Ritual Status</strong>
          <span class="small-text" style="opacity:.8;">Overview</span>
        </div>
        <div class="small-text" style="opacity:.8;">No staff members available for ritual checks.</div>
      </div>
    `;return}const i={border:"rgba(255,255,255,0.10)",bg:"linear-gradient(180deg, rgba(16,18,24,0.96), rgba(13,15,20,0.96))",badgeBg:"rgba(255,255,255,0.10)",badgeText:"#e5e7eb"};t.innerHTML=`
    <div class="card" style="padding:12px; display:flex; flex-direction:column; gap:10px; border:1px solid ${i.border}; background:${i.bg};">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <strong>Ritual Status</strong>
        <span class="small-text" style="opacity:.9; padding:3px 8px; border-radius:999px; background:${i.badgeBg}; color:${i.badgeText}; text-transform:uppercase; letter-spacing:.04em;">Overview</span>
      </div>
      <div class="small-text" style="opacity:.82;">
        Check whether a staff member has completed today’s ritual in the current restaurant.
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <select id="mbRitualStatusStaffSelect" class="input" style="min-width:240px;"></select>
        <button id="mbRitualStatusRefresh" class="btn-ghost" type="button">Refresh</button>
        <span id="mbRitualStatusBadge" class="small-text" style="padding:3px 8px; border-radius:999px; background:rgba(255,255,255,0.10);">Loading…</span>
      </div>
      <div id="mbRitualStatusDetails" class="small-text" style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px 12px;"></div>
    </div>
  `;const l=document.getElementById("mbRitualStatusStaffSelect"),c=document.getElementById("mbRitualStatusRefresh"),o=document.getElementById("mbRitualStatusBadge"),d=document.getElementById("mbRitualStatusDetails");Au(l,{selectedUserId:s});const p=(g={})=>{const u=!!g?.doneToday,f=g?.latestOccurredAt||null,h=g?.windowStartIso||null;o&&(o.textContent=u?"Completed today":"Not completed",o.style.background=u?"rgba(62,184,122,0.18)":"rgba(232,170,64,0.18)",o.style.color=u?"#b8f1cf":"#ffe1a8"),d&&(d.innerHTML=`
        <div><b>Staff member:</b> ${y(l?.selectedOptions?.[0]?.textContent||s||"-")}</div>
        <div><b>Restaurant:</b> ${y(Nr(n)||"-")}</div>
        <div><b>Checked from:</b> ${y(h?new Date(h).toLocaleString():"—")}</div>
        <div><b>Last ritual:</b> ${y(f?new Date(f).toLocaleString():"—")}</div>
      `)},m=async(g=s)=>{o&&(o.textContent="Checking…",o.style.background="rgba(255,255,255,0.10)",o.style.color="#e5e7eb");const u=await Bu({userId:g,restaurantId:n});return window.__BC_MB_RITUAL_STATUS_LAST_RESULT__={userId:g,restaurantId:n,...u,loadedAt:Date.now()},p(u),u};l&&!l.__bcRitualStatusBound&&(l.__bcRitualStatusBound=!0,l.addEventListener("change",async()=>{const g=String(l.value||"").trim();window.__BC_MB_RITUAL_STATUS_USER_ID__=g,await m(g)})),c&&!c.__bcRitualStatusBound&&(c.__bcRitualStatusBound=!0,c.addEventListener("click",async()=>{await m(String(l?.value||s||""))})),await m(s)}function ia(e){window.__BC_GROUP_MANAGER_METRICS__=e||{restaurantsCount:0,pendingInvitesCount:0,recentTimedChallengesCount:0,recentDrillCompletionsCount:0}}function Mu(){return window.__BC_GROUP_MANAGER_METRICS__||{restaurantsCount:0,pendingInvitesCount:0,recentTimedChallengesCount:0,recentDrillCompletionsCount:0}}function oa(e){window.__BC_GROUP_RESTAURANT_COMPARISON_ROWS__=Array.isArray(e)?e:[]}function xu(){return Array.isArray(window.__BC_GROUP_RESTAURANT_COMPARISON_ROWS__)?window.__BC_GROUP_RESTAURANT_COMPARISON_ROWS__:[]}async function Lu(){const e=_?.profile||{};if(!J(e).canManageMultipleRestaurants)return{restaurantsCount:0,pendingInvitesCount:0,recentTimedChallengesCount:0,recentDrillCompletionsCount:0};const n=Tu();if(!n.length)return{restaurantsCount:0,pendingInvitesCount:0,recentTimedChallengesCount:0,recentDrillCompletionsCount:0};const r=new Date(Date.now()-10080*60*1e3).toISOString(),[a,s]=await Promise.all([Z(I.from("restaurant_invites").select("restaurant_id,status").in("restaurant_id",n),12e3,"groupMetrics.invites"),Z(I.from("bc_messages_v1").select("restaurant_id,type,created_at").in("restaurant_id",n).in("type",["timed_challenge","timed_challenge_completed","timed_challenge_expired","drill_completed"]).gte("created_at",r),12e3,"groupMetrics.messages")]);if(a.error)throw a.error;if(s.error)throw s.error;const i=a.data||[],l=s.data||[];return{restaurantsCount:n.length,pendingInvitesCount:i.filter(c=>String(c?.status||"")==="pending").length,recentTimedChallengesCount:l.filter(c=>{const o=String(c?.type||"");return o==="timed_challenge"||o==="timed_challenge_completed"||o==="timed_challenge_expired"}).length,recentDrillCompletionsCount:l.filter(c=>String(c?.type||"")==="drill_completed").length}}async function ku(){const e=_?.profile||{};if(!J(e).canManageMultipleRestaurants)return[];const n=Un(),r=n.map(o=>String(o?.id||"")).filter(Boolean);if(!r.length)return[];const a=new Date(Date.now()-10080*60*1e3).toISOString(),[s,i]=await Promise.all([Z(I.from("restaurant_invites").select("restaurant_id,status").in("restaurant_id",r),12e3,"groupComparison.invites"),Z(I.from("bc_messages_v1").select("restaurant_id,type,created_at").in("restaurant_id",r).in("type",["timed_challenge","timed_challenge_completed","timed_challenge_expired","drill_completed"]).gte("created_at",a),12e3,"groupComparison.messages")]);if(s.error)throw s.error;if(i.error)throw i.error;const l=s.data||[],c=i.data||[];return n.map(o=>{const d=String(o?.id||""),p=o?.name||`Restaurant ${d.slice(0,8)}`,m=l.filter(f=>String(f?.restaurant_id||"")===d&&String(f?.status||"")==="pending").length,g=c.filter(f=>{const h=String(f?.type||"");return String(f?.restaurant_id||"")===d&&(h==="timed_challenge"||h==="timed_challenge_completed"||h==="timed_challenge_expired")}).length,u=c.filter(f=>String(f?.restaurant_id||"")===d&&String(f?.type||"")==="drill_completed").length;return{restaurantId:d,name:p,pendingInvites:m,timedChallengeActivity:g,drillCompletions:u,isActive:String(j()||"")===d}})}function Ee(e={}){const t=!!e.keepStatus;nt({userId:"",rows:[]}),window.__BC_MB_ACTIVE_THREAD_EMAIL__=null,window.__BC_MB_ACTIVE_THREAD_RESTAURANT_ID__=null,window.__BC_MB_THREADS__=[],window.__BC_MB_MESSAGES__=[],window.__BC_MESSENGER_ROWS__=[];const n=document.getElementById("mbThreadTitle");n&&(n.textContent="Select a waiter");const r=document.getElementById("mbThreadMeta");r&&(r.textContent="");const a=document.getElementById("mbThreadList");a&&(a.innerHTML="");const s=document.getElementById("mbThreadMessages");s&&(s.innerHTML=`
      <div class="small-text" style="opacity:.75;">
        Select a waiter thread in this restaurant to assign a timed challenge.
      </div>
    `);const i=document.getElementById("mbThreadTimelinePanel");i&&(i.innerHTML=`
      <div style="font-weight:600;">Thread Snapshot</div>
      <div class="small-text" style="margin-top:6px; opacity:.75;">
        Select a waiter to view the latest objective and performance reflection.
      </div>
    `);const l=document.getElementById("mbThreadEmpty");if(l&&(l.style.display="none"),!t){const c=U("mbInstrStatus");c&&(c.textContent="")}}function Nu(e){const t=String(e||"");return t?(Array.isArray(window.__BC_MB_THREADS__)?window.__BC_MB_THREADS__:[]).some(r=>String(r?.userId||"")===t):!1}function js(){const e=String(window.__BC_MB_ACTIVE_THREAD_USER_ID__||"");e&&(Nu(e)||Ee({keepStatus:!0}))}function Io(){return window.appState?.profile?.scope_id||window.appState?.profile?.group_id||null}const er=2;function Pu(e=new Date){const t=new Date(e);t.setHours(0,0,0,0);const n=new Date(t);return n.setDate(n.getDate()+1),{startIso:t.toISOString(),endIso:n.toISOString()}}async function Co({senderUserId:e=null}={}){const t=String(e||_?.session?.user?.id||_?.session?.userId||"").trim();if(!t)return{used:0,remaining:er,limit:er};const{startIso:n,endIso:r}=Pu(),{count:a,error:s}=await I.from("bc_messages_v1").select("id",{count:"exact",head:!0}).eq("sender_user_id",t).eq("type","instruction").is("archived_at",null).gte("created_at",n).lt("created_at",r);if(s)throw s;const i=Math.max(0,Number(a||0));return{used:i,remaining:Math.max(0,er-i),limit:er}}async function fr(){const e=U("mbInstrQuota"),t=U("mbInstrSend");if(!e&&!t)return null;try{const n=await Co();if(window.__BC_MANAGER_MESSAGE_QUOTA__=n,e&&(e.textContent=n.remaining>0?`${n.remaining} free messages left today`:"Daily free message limit reached"),t){const r=n.remaining<=0;t.disabled=r,t.style.opacity=r?".6":"1",t.style.cursor=r?"not-allowed":"",t.title=r?"Daily free message limit reached":"Send message"}return n}catch(n){return console.warn("[MESSENGER QUOTA] refresh failed",n),e&&(e.textContent="Could not load message limit."),null}}function U(e){return document.getElementById(e)}window.__BC_MB_THREADS__=[];window.__BC_MB_THREADS_ALL__=[];window.__BC_MB_ACTIVE_THREAD_USER_ID__=null;window.__BC_MB_RITUAL_STATUS_USER_ID__="";window.__BC_MB_RITUAL_STATUS_LAST_RESULT__=null;window.__BC_MB_ACTIVE_THREAD_ROWS__=[];window.__MB_LAST_MESSAGES__=[];window.__BC_MB_PEOPLE_SEARCH__="";window.__BC_MB_MESSENGER_SEARCH__="";function nt({userId:e="",rows:t=[]}={}){window.__BC_MB_ACTIVE_THREAD_USER_ID__=String(e||""),window.__BC_MB_ACTIVE_THREAD_ROWS__=Array.isArray(t)?t:[],At({user_id:String(e||"")||null,restaurant_id:window.getActiveRestaurantId?.()||_?.activeRestaurantId||_?.profile?.restaurant_id||null})}function Pr(e=""){return String(e||"").trim().toLowerCase()}function Vs(){return Pr(window.__BC_MB_PEOPLE_SEARCH__||document.getElementById("mbPeopleSearch")?.value||"")}function Ks(){return Pr(window.__BC_MB_MESSENGER_SEARCH__||document.getElementById("mbMessengerSearch")?.value||"")}function Du(e=[],t=""){const n=Pr(t);return n?(Array.isArray(e)?e:[]).filter(r=>[r?.display_name,r?.user_id,r?.role,rt(r?.role)].filter(Boolean).join(" ").toLowerCase().includes(n)):Array.isArray(e)?e:[]}function Ou(e=[],t={},n=""){const r=Pr(n);return r?(Array.isArray(e)?e:[]).filter(a=>{const s=String(a?.title||De(a?.userId,t)||""),i=String(a?.latestBody||""),l=String(a?.latestType||""),c=String(a?.userId||"");return`${s} ${i} ${l} ${c}`.toLowerCase().includes(r)}):Array.isArray(e)?e:[]}function En(e=[],t={}){const n=U("mbThreadList"),r=U("mbThreadEmpty");if(!n||!r)return;const a=Ou(e,t,Ks());if(window.__BC_MB_THREADS__=a,n.innerHTML=a.map(l=>dm(l,t)).join(""),r.style.display=a.length?"none":"block",r.textContent=Ks()?"No threads match your search.":"No waiter threads yet.",!a.length){nt({userId:"",rows:[]}),O("renderManagerActiveThread",()=>St(t));return}const s=String(window.__BC_MB_ACTIVE_THREAD_USER_ID__||"");a.some(l=>String(l?.userId||"")===s)||nt({userId:a[0]?.userId||"",rows:a[0]?.rows||[]})}function Xa(){const e=U("mbPeopleSearch"),t=U("mbPeopleSearchClear");e&&!e.__wired&&(e.__wired=!0,e.addEventListener("input",()=>{window.__BC_MB_PEOPLE_SEARCH__=String(e.value||""),ft().catch(console.error)}),e.addEventListener("keydown",a=>{a.key==="Escape"&&e.value&&(a.preventDefault(),e.value="",window.__BC_MB_PEOPLE_SEARCH__="",ft().catch(console.error))})),t&&!t.__wired&&(t.__wired=!0,t.addEventListener("click",()=>{e&&(e.value=""),window.__BC_MB_PEOPLE_SEARCH__="",ft().catch(console.error),e?.focus()}));const n=U("mbMessengerSearch"),r=U("mbMessengerSearchClear");if(n&&!n.__wired){n.__wired=!0;const a=async()=>{window.__BC_MB_MESSENGER_SEARCH__=String(n.value||"");const s=Array.isArray(window.__BC_MB_THREADS_ALL__)?window.__BC_MB_THREADS_ALL__:[],i=await se(s.map(l=>l.userId));En(s,i),O("renderManagerActiveThread",()=>St(i)),Rt()};n.addEventListener("input",()=>{a().catch(console.error)}),n.addEventListener("keydown",s=>{s.key==="Escape"&&n.value&&(s.preventDefault(),n.value="",a().catch(console.error))})}r&&!r.__wired&&(r.__wired=!0,r.addEventListener("click",()=>{n&&(n.value=""),window.__BC_MB_MESSENGER_SEARCH__="";const a=Array.isArray(window.__BC_MB_THREADS_ALL__)?window.__BC_MB_THREADS_ALL__:[];se(a.map(s=>s.userId)).then(s=>{En(a,s),O("renderManagerActiveThread",()=>St(s)),Rt(),n?.focus()}).catch(console.error)}))}function $u(e,t=1e3*60*20){const n=Number(e||0);if(!n)return!1;const r=Date.now()-n;return Number.isFinite(r)&&r>=0&&r<=t}function Uu(){const e=window.__BC_PARENT_LAST_DRILL_STARTED__||null;e&&((n,r=1e3*60*30)=>{const a=Number(n||0);return a?Date.now()-a>r:!1})(e.at)&&(window.__BC_PARENT_LAST_DRILL_STARTED__=null)}function Hu(){const e=Array.isArray(window.__BC_MB_ACTIVE_THREAD_ROWS__)?window.__BC_MB_ACTIVE_THREAD_ROWS__:[];!String(window.__BC_MB_ACTIVE_THREAD_USER_ID__||"")&&e.length&&console.warn("[BC][INV] active thread rows exist without active user id");const n=de?.();Number(n?.influence||0)>Number(n?.maxInfluence||0)&&console.warn("[BC][INV] influence exceeds max",n)}function ce(e={}){const{thread:t=!0,board:n=!0,economy:r=!0,liveControls:a=!0,challengeMeta:s=!0}=e||{};Uu?.(),t&&(O?.("renderManagerThreadDrillSummary",()=>In?.()),O?.("renderTimedChallengeRecentSummary",()=>Dn?.()),O?.("renderDisplayMethodChallengeRecentSummary",()=>Tr?.())),n&&(O?.("renderManagerBoardDrillSummary",()=>yr?.()),O?.("renderManagerBoardOverviewLiveEffects",()=>un?.()),O?.("renderManagerBoardOverviewDisplayMethodChallenge",()=>Di?.())),r&&O?.("renderManagerAbilityEconomyPanel",()=>is?.()),a&&(O?.("renderManagerAttributeEffectsPanel",()=>Uo?.()),O?.("renderManagerAreaEffectsPanel",()=>Ho?.()),O?.("renderManagerTimedChallengeActionPanel",()=>Qo?.()),O?.("renderManagerDisplayMethodActionPanel",()=>Jo?.()),O?.("loadTimedChallengeWineOptions",()=>Et?.().catch(console.warn))),s&&(O?.("renderManagerTimedChallengeActionMeta",()=>ds?.()),O?.("renderMessengerTimedChallengeMeta",()=>Ko?.()),O?.("renderManagerDisplayMethodActionMeta",()=>Ot?.())),Hu?.()}window.__BC_MANAGER_DEBUG_STATE__=function(){return{activeThreadUserId:window.__BC_MB_ACTIVE_THREAD_USER_ID__||"",activeThreadRowsCount:Array.isArray(window.__BC_MB_ACTIVE_THREAD_ROWS__)?window.__BC_MB_ACTIVE_THREAD_ROWS__.length:0,parentLastDrillStarted:window.__BC_PARENT_LAST_DRILL_STARTED__||null,managerLiveEffectsState:window.__BC_MANAGER_LIVE_EFFECTS_STATE__||null,abilityEconomy:typeof de=="function"?de():null}};function Gu(e){if(!e||!e.skills)return[];const t=e.skills,n=[{key:"read",label:"Guest Reading",drillFocus:"read"},{key:"framing",label:"Framing",drillFocus:"frame"},{key:"delivery",label:"Delivery",drillFocus:"delivery"},{key:"recovery",label:"Recovery",drillFocus:"recovery"},{key:"closing",label:"Closing",drillFocus:"closing"}];n.sort((i,l)=>(t[i.key]??0)-(t[l.key]??0));const r=n[0],a=n[1],s=[];return r&&s.push({label:`Run ${r.label} Drill`,type:"drill",focus:r.drillFocus}),a&&s.push({label:`Practice ${a.label}`,type:"message",text:`Focus on ${a.label.toLowerCase()} during your next tables.`}),s.push({label:"Encourage confidence",type:"message",text:"Good work — keep your delivery confident and concise."}),s}function fe(e){let n=e&&typeof e=="object"&&"payload"in e?e.payload:e;if(typeof n=="string")try{n=JSON.parse(n)}catch{n=null}if(!n||typeof n!="object")return null;const r=n.report||n.progressReport||n.progress_report||n.summary||n.payload||null;if(r&&typeof r=="object"&&r!==n){const a=n.skills||r.skills||null;return{...n,...r,skills:a}}return n}function Wu(e){const n=(Array.isArray(e)?e:[]).filter(r=>String(r?.type||"")==="drill_override").sort((r,a)=>new Date(a?.created_at||0)-new Date(r?.created_at||0))[0];return n?{focus:String(n?.payload?.drill?.focus||"").toLowerCase(),createdAt:n?.created_at?new Date(n.created_at):null}:null}function Fu(e,t,n=48){return!e?.createdAt||!e?.focus||String(e.focus)!==String(t||"").toLowerCase()?!1:Date.now()-e.createdAt.getTime()<n*60*60*1e3}function qu(e){const t=Array.isArray(e?.rows)?e.rows:[],n=[...t].sort((c,o)=>new Date(o?.created_at||0)-new Date(c?.created_at||0))[0],a=(fe(n)||{})?.skills||null;if(!a)return null;const s=[{key:"read",label:"Guest Reading",focus:"read"},{key:"framing",label:"Framing",focus:"frame"},{key:"delivery",label:"Delivery",focus:"delivery"},{key:"recovery",label:"Recovery",focus:"recovery"},{key:"closing",label:"Closing",focus:"closing"}].sort((c,o)=>(a[c.key]??0)-(a[o.key]??0)),i=Wu(t);for(const c of s){const o=a[c.key]??0;if(!(o>=40)&&!Fu(i,c.focus,48))return{label:c.label,focus:c.focus,pct:o,cooldown:!1}}const l=s[0];return l?{label:l.label,focus:l.focus,pct:a[l.key]??0,cooldown:!0}:null}function ju(e=[]){const t=Array.isArray(e)?e:[],n=[...t].filter(M=>String(M?.type||"")==="progress_report"&&fe(M)).sort((M,N)=>new Date(M.created_at)-new Date(N.created_at)).slice(-1)[0]||null,r=[...t].filter(M=>String(M?.type||"").startsWith("timed_challenge")).sort((M,N)=>new Date(M.created_at)-new Date(N.created_at)).slice(-1)[0]||null,a=[...t].filter(M=>String(M?.type||"")==="timed_challenge").sort((M,N)=>new Date(M.created_at)-new Date(N.created_at)).slice(-1)[0]||null,s=[...t].filter(M=>String(M?.type||"")==="timed_challenge_completed").sort((M,N)=>new Date(M.created_at)-new Date(N.created_at)).slice(-1)[0]||null,i=[...t].filter(M=>String(M?.type||"")==="timed_challenge_expired").sort((M,N)=>new Date(M.created_at)-new Date(N.created_at)).slice(-1)[0]||null,l=[...t].filter(M=>String(M?.type||"")==="drill_override").sort((M,N)=>new Date(M.created_at)-new Date(N.created_at)).slice(-1)[0]||null,c=[...t].filter(M=>String(M?.type||"")==="drill_started").sort((M,N)=>new Date(M.created_at)-new Date(N.created_at)).slice(-1)[0]||null,o=[...t].filter(M=>String(M?.type||"")==="drill_completed").sort((M,N)=>new Date(M.created_at)-new Date(N.created_at)).slice(-1)[0]||null,d=n?.payload||{},p=d?.skills||{},m=String(d?.weakestSkill||"").toLowerCase(),g=String(d?.strongestSkill||"").toLowerCase(),u=String(d?.outcome||"").toLowerCase(),f=String(d?.chainSignal||"").toLowerCase(),h=String(d?.guestStateActual||"").toLowerCase(),w=!!d?.resetUsed,S=Number(d?.deliveryScore||0)||0,E=!!d?.guestReadCorrect,b=Number(d?.chainScore||0)||0,B=Number(d?.strongPillars||0)||0,L=String(r?.payload?.challengeKey||r?.payload?.challenge_key||"").toLowerCase(),k=[...t].filter(M=>String(M?.type||"")==="timed_challenge").sort((M,N)=>new Date(M.created_at)-new Date(N.created_at)).slice(-5).map(M=>String(M?.payload?.challengeKey||M?.payload?.challenge_key||"").toLowerCase()).filter(Boolean),v=a?new Date(a.created_at||0).getTime():0,R=s?new Date(s.created_at||0).getTime():0,T=i?new Date(i.created_at||0).getTime():0,A=l?new Date(l.created_at||0).getTime():0,W=c?Number(c?.payload?.startedAt||0)||new Date(c.created_at||0).getTime():0,H=o?new Date(o.created_at||0).getTime():0,P=!!v&&v>Math.max(R,T),C=Math.max(A,W)>H,D=P?String(a?.payload?.focus||"").toLowerCase():"",V=C?String(c?.payload?.focus||l?.payload?.drill?.focus||"").toLowerCase():"";return{latestProgress:n,weakestSkill:m,strongestSkill:g,outcome:u,chainSignal:f,guest:h,resetUsed:w,deliveryScore:S,guestReadCorrect:E,chainScore:b,strongPillars:B,recentChallengeKey:L,recentChallengeHistory:k,skills:p,challengeCurrentlyActive:P,drillCurrentlyActive:C,activeChallengeFocus:D,activeDrillFocus:V}}function Vu(e=[]){const t=ju(e),n=de(),r=Number(n?.influence||0),a={read_first:"read",full_delivery:"delivery",recovery_window:"recovery",closing_push:"closing",clean_close:"closing",no_reset_run:"delivery",stable_signal:"recovery",solid_interaction:"recovery"};return[{key:"read_first",label:"Read First"},{key:"full_delivery",label:"Full Delivery"},{key:"recovery_window",label:"Recovery Window"},{key:"closing_push",label:"Closing Push"},{key:"clean_close",label:"Clean Close"},{key:"no_reset_run",label:"No Reset Run"},{key:"stable_signal",label:"Stable Signal"},{key:"solid_interaction",label:"Solid Interaction"}].map(l=>{let c=0;const o=[],d=a[l.key]||"",p=t.recentChallengeHistory.filter(h=>h===l.key).length;l.key==="read_first"&&(t.weakestSkill==="read"||!t.guestReadCorrect)&&(c+=5,o.push("Weak guest reading in latest report.")),l.key==="full_delivery"&&(t.weakestSkill==="delivery"||t.deliveryScore<2)&&(c+=5,o.push("Latest interaction showed incomplete delivery.")),l.key==="recovery_window"&&(t.weakestSkill==="recovery"||t.outcome==="recovery"||t.outcome==="pivot")&&(c+=5,o.push("Recent outcome suggests recovery weakness.")),l.key==="closing_push"&&(t.weakestSkill==="closing"||t.outcome==="soft_close")&&(c+=5,o.push("Recent interaction suggests weak finishing pressure.")),l.key==="clean_close"&&t.outcome&&t.outcome!=="clean_close"&&(c+=4,o.push("Latest outcome did not reach a clean close.")),l.key==="no_reset_run"&&t.resetUsed&&(c+=4,o.push("Latest interaction relied on reset.")),l.key==="stable_signal"&&t.chainSignal==="red"&&(c+=4,o.push("Latest interaction fell into a red signal state.")),l.key==="solid_interaction"&&t.chainScore>0&&t.chainScore<6&&(c+=3,o.push("Latest interaction lacked enough overall structure.")),d&&d===t.strongestSkill&&t.strongPillars>=3&&(c+=2,o.push("Builds on the waiter's current strongest area.")),l.key==="clean_close"&&(t.guest==="decider"||t.guest==="dictator")&&(c+=2,o.push("Dictator tables reward decisive finishes.")),l.key==="read_first"&&t.guest==="griever"&&(c+=2,o.push("Griever tables punish poor emotional reads.")),l.key==="full_delivery"&&t.guest==="fancy"&&(c+=2,o.push("Fancy tables reward complete delivery confidence.")),d&&t.activeDrillFocus&&d===t.activeDrillFocus&&(c+=3,o.push("Matches the current drill focus.")),d&&t.activeChallengeFocus&&d===t.activeChallengeFocus&&(c+=1,o.push("Aligns with the current live challenge theme.")),t.challengeCurrentlyActive&&(c-=2,o.push("A challenge is already active.")),t.drillCurrentlyActive&&(l.key==="read_first"||l.key==="full_delivery")&&(c-=1,o.push("A drill is already in progress.")),l.key===t.recentChallengeKey&&(c-=3,o.push("This was the most recent challenge.")),p>1&&(c-=p,o.push("This challenge has been used repeatedly in recent history."));const m=Number(Hn?.[l.key]||0),g=Bt(l.key),u=r>=m;u||(c-=4),g>0&&(c-=5);const f=o[0]||"Good fit for the current training state.";return{...l,score:c,reason:f,cost:m,cooldown:g,affordable:u}}).sort((l,c)=>c.score-l.score).slice(0,3)}function Ku(e=[]){const t=Vu(e);if(!t.length)return`
      <div class="small-text" style="opacity:.75;">
        No recommendation yet.
      </div>
    `;const n=t.findIndex(r=>r.cooldown<=0&&r.affordable);return`
    <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
      ${t.map((r,a)=>`
        <button
          type="button"
          class="btn-ghost mbChallengeSuggestion"
          data-challenge-key="${y(r.key)}"
          title="${y(r.reason)}"
          style="
            text-align:left;
            opacity:${r.cooldown>0||!r.affordable?"0.7":"1"};
            border:1px solid rgba(255,255,255,0.08);
            background:rgba(255,255,255,0.03);
            border-radius:10px;
            padding:8px;
          "
        >
          <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
            <div style="font-weight:600;">
              ${y(r.label)}
              ${a===n?'<span class="small-text" style="opacity:.75;"> • Recommended</span>':""}
            </div>
            <div class="small-text" style="opacity:.7;">
              ${y(An(r.cost))}
              ${r.cooldown>0?` • ${y(`${r.cooldown}s cd`)}`:""}
              ${r.affordable?"":" • blocked"}
            </div>
          </div>
          <div class="small-text" style="opacity:.75; margin-top:2px;">
            ${y(r.reason)}
          </div>

          <div class="small-text" style="opacity:.6; margin-top:4px;">
            Score: ${y(String(r.score))}
          </div>
        </button>
      `).join("")}
    </div>
  `}function Yu(e=[]){const n=[...Array.isArray(e)?e:[]].filter(w=>String(w?.type||"")==="progress_report"&&fe(w)).sort((w,S)=>new Date(w.created_at)-new Date(S.created_at)).slice(-1)[0]||null,r=fe(n)||{},a=String(r?.weakestSkill||"").toLowerCase(),s=String(r?.strongestSkill||"").toLowerCase(),i=String(r?.outcome||"").toLowerCase(),l=String(r?.chainSignal||"").toLowerCase(),c=String(r?.guestStateActual||"").toLowerCase(),o=!!r?.resetUsed,d=Number(r?.deliveryScore||0)||0,p=!!r?.guestReadCorrect,m=Number(r?.chainScore||0)||0,g=Number(r?.strongPillars||0)||0,u=!!r?.premiumSuccess,f=ve?.()||{attributeEffects:[],areaEffects:[]},h=[...(f.attributeEffects||[]).filter(w=>!!w?.active).map(w=>String(w?.id||"").toLowerCase()),...(f.areaEffects||[]).filter(w=>!!w?.active).map(w=>String(w?.id||"").toLowerCase())];return{latestProgress:n,weakestSkill:a,strongestSkill:s,outcome:i,chainSignal:l,guest:c,resetUsed:o,deliveryScore:d,guestReadCorrect:p,chainScore:m,strongPillars:g,premiumSuccess:u,activeEffectIds:h}}function zu(e=[]){const t=Yu(e),n=de(),r=Number(n?.influence||0);return[{key:"closing_surge",label:"Closing Surge",family:"attribute"},{key:"recovery_focus",label:"Recovery Focus",family:"attribute"},{key:"premium_window",label:"Premium Window",family:"area"},{key:"calm_floor",label:"Calm Floor",family:"area"}].map(i=>{let l=0;const c=[],o=t.activeEffectIds.includes(i.key);i.key==="closing_surge"&&(t.weakestSkill==="closing"||t.outcome==="soft_close")&&(l+=5,c.push("Recent interaction suggests weak finishing pressure.")),i.key==="recovery_focus"&&(t.weakestSkill==="recovery"||t.outcome==="recovery"||t.outcome==="pivot")&&(l+=5,c.push("Recent encounter suggests recovery weakness.")),i.key==="premium_window"&&(t.guest==="celebrator"||t.guest==="fancy"||t.chainSignal==="green"&&t.strongPillars>=2&&!t.premiumSuccess)&&(l+=4,c.push("Current interaction shape supports an upgrade window.")),i.key==="calm_floor"&&(t.chainSignal==="red"||t.resetUsed||t.guest==="griever")&&(l+=4,c.push("The table likely needs stabilization.")),i.key==="closing_surge"&&(t.guest==="decider"||t.guest==="dictator")&&(l+=2,c.push("Dictator tables reward clear finishes.")),i.key==="recovery_focus"&&t.guest==="griever"&&(l+=2,c.push("Griever tables punish rough recovery.")),i.key==="premium_window"&&t.guest==="celebrator"&&(l+=2,c.push("Celebrator tables are more open to premium moves.")),i.key==="calm_floor"&&t.guest==="griever"&&(l+=2,c.push("Griever tables benefit from lower pressure.")),o&&(l-=6,c.push("This effect is already active."));const d=Number(bt?.[i.key]||0),p=Bt(i.key),m=r>=d,g=!ss()&&!o;m||(l-=4),p>0&&(l-=5),g&&(l-=5);const u=c.find(Boolean)||"Useful support effect for the current table.";return{...i,score:l,reason:u,cost:d,cooldown:p,affordable:m,blockedByCap:g,isAlreadyActive:o}}).sort((i,l)=>l.score-i.score).slice(0,3)}function Qu(e=[]){const t=zu(e);if(!t.length)return`
      <div class="small-text" style="opacity:.75;">
        No effect recommendation yet.
      </div>
    `;const n=t.findIndex(r=>r.cooldown<=0&&r.affordable&&!r.blockedByCap&&!r.isAlreadyActive);return`
    <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
      ${t.map((r,a)=>`
        <button
          type="button"
          class="btn-ghost mbEffectSuggestion"
          data-effect-key="${y(r.key)}"
          title="${y(r.reason)}"
          style="
            text-align:left;
            opacity:${r.cooldown>0||!r.affordable||r.blockedByCap||r.isAlreadyActive?"0.7":"1"};
            border:1px solid rgba(255,255,255,0.08);
            background:rgba(255,255,255,0.03);
            border-radius:10px;
            padding:8px;
          "
        >
          <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
            <div style="font-weight:600;">
              ${y(r.label)}
              ${a===n?'<span class="small-text" style="opacity:.75;"> • Recommended</span>':""}
            </div>

            <div class="small-text" style="opacity:.7;">
              ${y(An(r.cost))}
              ${r.cooldown>0?` • ${y(`${r.cooldown}s cd`)}`:""}
              ${r.isAlreadyActive?" • active":""}
              ${r.blockedByCap?" • cap":""}
              ${r.affordable?"":" • blocked"}
            </div>
          </div>

          <div class="small-text" style="opacity:.75; margin-top:2px;">
            ${y(r.reason)}
          </div>
        </button>
      `).join("")}
    </div>
  `}function Ju(){const e=document.getElementById("mbThreadStatePanel");if(!e)return;const t=String(document.getElementById("mbThreadMeta")?.textContent||"").trim(),n=String(document.getElementById("mbThreadDrillSummary")?.innerHTML||"").trim();e.innerHTML=`
    <div style="display:flex; flex-direction:column; gap:8px;">
      <div style="font-weight:600;">Current Coaching State</div>

      <div class="small-text" style="opacity:.9;">
        ${y(t||"No current objective")}
      </div>

      <div class="small-text" style="opacity:.82;">
        ${n||'<span style="opacity:.75;">No drill lifecycle yet for this waiter.</span>'}
      </div>
    </div>
  `}function Xu(e){const t=document.getElementById("mbThreadChallengeRecommendations");if(!t)return;const n=Array.isArray(e?.rows)?e.rows:[];t.innerHTML=`
    <div style="display:flex; flex-direction:column; gap:12px;">
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="font-weight:600;">Suggested Challenges</div>
        ${Ku(n)}
      </div>

      <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="font-weight:600;">Suggested Live Effects</div>
        ${Qu(n)}
      </div>
    </div>
  `,To?.(),Zu?.()}function Ca(){document.querySelectorAll(".mbCoachSuggestion").forEach(e=>{e.onclick=()=>{const t=Number(e.dataset.index),n=e.closest("[data-msg-id]")?.dataset.msgId,r=window.__MB_LAST_MESSAGES__?.find(l=>String(l.id)===String(n));if(!r)return;const s=Gu(fe(r)||{})[t];if(!s)return;const i=U("mbInstrBody");i&&(s.type==="message"&&(i.value=s.text),s.type==="drill"&&(i.value=`Run a focused ${s.focus} drill before your next shift.`),i.focus())}})}function To(){document.querySelectorAll(".mbChallengeSuggestion").forEach(t=>{t.__wired||(t.__wired=!0,t.addEventListener("click",()=>{const n=String(t.getAttribute("data-challenge-key")||""),r=Number(Hn?.[n]||0),a=vt({key:n,cost:r,type:"challenge"}),s=document.getElementById("mbTimedChallengeType"),i=document.getElementById("mbLcTimedChallengeType");s&&(s.value=n),i&&(i.value=n),ds?.(),Ko?.();const l=document.getElementById("mbTimedChallengeStatus")||document.getElementById("mbLcTimedChallengeStatus");l&&(l.textContent=a?`Selected recommended challenge: ${n} • ${a}`:`Selected recommended challenge: ${n}`)}))})}function Zu(){document.querySelectorAll(".mbEffectSuggestion").forEach(t=>{t.__wired||(t.__wired=!0,t.addEventListener("click",()=>{const n=String(t.getAttribute("data-effect-key")||""),r=Number(bt?.[n]||0),a=vt({key:n,cost:r,type:"effect"}),i={closing_surge:"btnAddClosingSurge",recovery_focus:"btnAddRecoveryFocus",premium_window:"btnAddPremiumWindow",calm_floor:"btnAddCalmFloor"}[n]||"",l=document.getElementById(i);l&&l.scrollIntoView({behavior:"smooth",block:"center"});const c=document.getElementById("mbLcTimedChallengeStatus")||document.getElementById("mbTimedChallengeStatus");c&&(c.textContent=a?`Recommended effect: ${n} • ${a}`:`Recommended effect: ${n}`)}))})}function em(){document.querySelectorAll("[data-auto-drill-focus]").forEach(e=>{e.__wired||(e.__wired=!0,e.addEventListener("click",()=>{const t=String(e.getAttribute("data-auto-drill-focus")||"").toLowerCase();t&&us({focus:t}).catch(n=>{const r=U("mbInstrStatus");r&&(r.textContent=n?.message||String(n))})}))})}function Ta(e,t){if(!e||!t)return;const n=e.getContext("2d"),r=e.width,a=e.height;n.clearRect(0,0,r,a);const s=[{key:"read",label:"READ"},{key:"framing",label:"FRAME"},{key:"delivery",label:"DELIVER"},{key:"recovery",label:"RECOVER"},{key:"closing",label:"CLOSE"}],i=s.map(({key:p})=>Math.max(0,Math.min(100,Number(t?.[p]||0)))/100),l=r/2,c=a/2,o=Math.min(r,a)*.34,d=Math.PI*2/s.length;n.strokeStyle="rgba(255,255,255,0.18)",n.lineWidth=1;for(let p=.2;p<=1;p+=.2)n.beginPath(),s.forEach((m,g)=>{const u=d*g-Math.PI/2,f=l+Math.cos(u)*o*p,h=c+Math.sin(u)*o*p;g===0?n.moveTo(f,h):n.lineTo(f,h)}),n.closePath(),n.stroke();s.forEach((p,m)=>{const g=d*m-Math.PI/2,u=l+Math.cos(g)*o,f=c+Math.sin(g)*o;n.beginPath(),n.moveTo(l,c),n.lineTo(u,f),n.stroke()}),n.beginPath(),i.forEach((p,m)=>{const g=d*m-Math.PI/2,u=p>0?Math.max(p,.08):0,f=l+Math.cos(g)*o*u,h=c+Math.sin(g)*o*u;m===0?n.moveTo(f,h):n.lineTo(f,h)}),n.closePath(),n.fillStyle="rgba(90,180,255,0.22)",n.strokeStyle="rgba(90,180,255,0.95)",n.lineWidth=2,n.fill(),n.stroke(),n.fillStyle="rgba(255,255,255,0.88)",n.font="11px sans-serif",s.forEach(({label:p},m)=>{const g=d*m-Math.PI/2,u=l+Math.cos(g)*(o+18),f=c+Math.sin(g)*(o+18);n.fillText(p,u-18,f+4)})}async function Ao(){const{restaurantId:e}=We(),t=document.getElementById("mbHistoryUser");if(!e||!t)return;const n=_?.session?.user?.id||_?.session?.userId||null,r=_?.profile||{},a=String(F(r)||r?.role||"").toLowerCase(),[s,i]=await Promise.all([I.from("profiles").select("user_id, display_name, role").eq("restaurant_id",e).order("display_name",{ascending:!0}),I.from("bc_skill_snapshots_v1").select("user_id, created_at").eq("restaurant_id",e).order("created_at",{ascending:!1}).limit(500)]);if(s.error){console.warn("[PERF HISTORY SELECT]",s.error),t.innerHTML="";return}i.error&&console.warn("[PERF HISTORY SELECT][SNAPSHOTS]",i.error);const l=new Map,c=Array.isArray(s.data)?s.data:[],o=Array.isArray(i.data)?i.data:[];for(const u of c){if(String(u?.role||"").toLowerCase()==="demo")continue;const h=String(u?.user_id||"");h&&l.set(h,{uid:h,label:u?.display_name||h})}for(const u of o){const f=String(u?.user_id||"");!f||l.has(f)||l.set(f,{uid:f,label:f})}if(n&&a!=="demo"&&!l.has(String(n))){const u=r?.display_name||_?.session?.user?.user_metadata?.display_name||_?.session?.user?.user_metadata?.full_name||(_?.session?.user?.email?String(_.session.user.email).split("@")[0]:"")||String(n);l.set(String(n),{uid:String(n),label:u})}const d=Array.from(l.keys()),p=await se(d),m=String(n&&a!=="demo"?n:t.value||""),g=d.map(u=>{const f=l.get(u);return{uid:u,label:p.get(u)||f?.label||u}}).sort((u,f)=>String(u.label).localeCompare(String(f.label)));t.innerHTML=g.map(u=>{const f=String(u.uid)===m?" selected":"";return`<option value="${u.uid}"${f}>${y(u.label||u.uid)}</option>`}).join(""),m&&(t.value=m)}async function Aa(e){const{restaurantId:t}=We();wo(e);const[n,r]=await Promise.all([I.from("bc_skill_snapshots_v1").select("*").eq("restaurant_id",t).eq("user_id",e).order("created_at",{ascending:!0}).limit(50),fi({restaurantId:t,userId:e,limit:120})]);n?.error&&console.warn("[MB][PERFORMANCE] bc_skill_snapshots_v1 query failed",n.error),r?.error&&console.warn("[MB][PERFORMANCE] bc_encounter_resolutions_v2 query failed",r.error);const a=Array.isArray(n?.data)?n.data:[],s=Array.isArray(r?.data)?r.data:[],i=Array.from(new Set(s.map(c=>String(c?.user_id||"").trim()).filter(Boolean))),l=await se(i);nm(a||[]),Bo(e,s||[],l)}function Bo(e,t,n=new Map){const r=document.getElementById("managerEncounterSummaryHost");if(!r)return;r.innerHTML="";const a=document.createElement("h4");if(a.innerText="Encounter summaries by waiter",r.appendChild(a),!Array.isArray(t)||!t.length){const g=document.createElement("div");g.className="small-text",g.innerText="No recent encounter summaries.",r.appendChild(g);return}const s=t.map(g=>fo(g)).filter(g=>!e||String(g.userId||"")===String(e));if(!s.some(g=>!!g.reflection||!!g.reactionSummary||!!g.aiPerception||Array.isArray(g.stepReactionTrail)&&g.stepReactionTrail.length>0||Array.isArray(g.stepSpine)&&g.stepSpine.length>0||Array.isArray(g.chosenPath)&&g.chosenPath.length>0||Array.isArray(g.bestPath)&&g.bestPath.length>0)){const g=document.createElement("div");g.className="small-text",g.style.marginTop="6px",g.style.opacity=".82",g.innerText="Recent encounters exist, but they were logged before reaction telemetry was included in the payload.",r.appendChild(g)}const l=document.createElement("div");l.className="manager-encounter-summary-list",r.appendChild(l);const c=document.createElement("div");c.className="card manager-encounter-detail-window hidden",r.appendChild(c);const o=s.reduce((g,u)=>{const f=String(u.userId||"").trim()||"__unknown__";return g.has(f)||g.set(f,[]),g.get(f).push(u),g},new Map),d=Array.from(o.entries()).map(([g,u])=>{const f=Math.max(...u.map(w=>new Date(w.occurredAt||0).getTime()||0),0),h=n.get(g)||(g==="__unknown__"?"Unknown waiter":g);return{userId:g,displayName:h,summaries:u.slice().sort((w,S)=>new Date(S.occurredAt||0).getTime()-new Date(w.occurredAt||0).getTime()),latestOccurredAt:f}}).sort((g,u)=>String(g.userId)===String(e||"")?-1:String(u.userId)===String(e||"")?1:u.latestOccurredAt!==g.latestOccurredAt?u.latestOccurredAt-g.latestOccurredAt:String(g.displayName).localeCompare(String(u.displayName)));function p(g){const u=document.createElement("div");u.className="manager-encounter-summary-item";const f=document.createElement("button");f.type="button",f.className="small-btn",f.innerText=`${new Date(g.occurredAt||Date.now()).toLocaleString()} • Grade ${g.performanceGrade||"—"}`;const h=document.createElement("div");return h.className="history-details is-collapsed",h.innerText="AI perception: "+(g.aiPerception||"—")+`
Bottle served: `+(g.bottleServed?"YES":"NO")+`
Chosen path: `+(g.chosenPathExposition||(g.chosenPath||[]).join(" -> ")||"—")+`
Best path: `+(g.bestPathExposition||(g.bestPath||[]).join(" -> ")||"—"),u.appendChild(f),u.appendChild(h),f.addEventListener("click",()=>{const w=h.classList.contains("is-collapsed");h.classList.toggle("is-collapsed",!w),f.innerText=w?`Hide • ${new Date(g.occurredAt||Date.now()).toLocaleString()}`:`${new Date(g.occurredAt||Date.now()).toLocaleString()} • Grade ${g.performanceGrade||"—"}`}),u}function m(g){l.classList.add("hidden"),c.classList.remove("hidden"),c.innerHTML=`
      <div class="manager-encounter-detail-header">
        <div>
          <div class="manager-encounter-detail-title">${y(g.displayName)}</div>
          <div class="manager-encounter-detail-meta">
            ${g.summaries.length} encounter${g.summaries.length===1?"":"s"} •
            Latest ${y(new Date(g.latestOccurredAt||Date.now()).toLocaleString())}
          </div>
        </div>
        <button type="button" class="small-btn manager-encounter-detail-close">Back</button>
      </div>
      <div class="manager-encounter-detail-list"></div>
    `;const u=c.querySelector(".manager-encounter-detail-close"),f=c.querySelector(".manager-encounter-detail-list");g.summaries.forEach(h=>{f.appendChild(p(h))}),u?.addEventListener("click",()=>{c.classList.add("hidden"),c.innerHTML="",l.classList.remove("hidden")})}d.forEach(g=>{const u=document.createElement("div");u.className="card manager-encounter-summary-card";const f=document.createElement("button");f.type="button",f.className="manager-encounter-user-btn",f.innerHTML=`
      <span class="manager-encounter-user-title">${y(g.displayName)}</span>
      <span class="manager-encounter-user-meta">
        ${g.summaries.length} encounter${g.summaries.length===1?"":"s"} •
        Latest ${y(new Date(g.latestOccurredAt||Date.now()).toLocaleString())}
      </span>
    `,u.appendChild(f),l.appendChild(u),f.addEventListener("click",()=>{m(g)})})}function tm(e=[]){const t=document.getElementById("mbPerformanceLegend");if(t){if(!Array.isArray(e)||!e.length){t.innerHTML="";return}t.innerHTML=`
    <div class="card" style="padding:10px;">
      <div style="font-weight:600; margin-bottom:8px;">Legend</div>
      <div style="display:flex; flex-wrap:wrap; gap:12px;">
        ${e.map(n=>`
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="
              display:inline-block;
              width:12px;
              height:12px;
              border-radius:999px;
              background:${n.color};
            "></span>
            <span class="small">${y(n.label||"-")}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `}}function nm(e){const t=document.getElementById("mbHistoryChart");if(!t)return;const n=t.getContext("2d"),r=t.width,a=t.height,s=[{key:"read_pct",label:"READ",color:"#60a5fa"},{key:"framing_pct",label:"FRAME",color:"#34d399"},{key:"delivery_pct",label:"DELIVER",color:"#f59e0b"},{key:"recovery_pct",label:"RECOVER",color:"#f472b6"},{key:"closing_pct",label:"CLOSE",color:"#a78bfa"}];if(n.clearRect(0,0,r,a),tm(s),!e.length){n.fillStyle="rgba(255,255,255,0.7)",n.font="14px sans-serif",n.fillText("No performance history yet.",20,30);return}const i=40,l=20,c=20,o=30,d=r-i-l,p=a-c-o;n.strokeStyle="rgba(255,255,255,0.20)",n.lineWidth=1,n.beginPath(),n.moveTo(i,c),n.lineTo(i,a-o),n.lineTo(r-l,a-o),n.stroke(),n.fillStyle="rgba(255,255,255,0.65)",n.font="11px sans-serif",[0,25,50,75,100].forEach(g=>{const u=c+p-g/100*p;n.fillText(String(g),8,u+4),n.strokeStyle="rgba(255,255,255,0.08)",n.beginPath(),n.moveTo(i,u),n.lineTo(r-l,u),n.stroke()});const m=e.length>1?d/(e.length-1):d/2;s.forEach(g=>{n.beginPath(),n.lineWidth=2,n.strokeStyle=g.color,e.forEach((u,f)=>{const h=Math.max(0,Math.min(100,Number(u?.[g.key]||0))),w=i+f*m,S=c+p-h/100*p;f===0?n.moveTo(w,S):n.lineTo(w,S)}),n.stroke()})}function rm(e,t){const n=De(e?.sender_user_id,t),r=String(e?.type||"message"),a=y(String(Rn(e?.created_at)||e?.created_at||"")),s=es(e),i=ts(e),l=gm(e),c=y(String(i?.title||e?.body||"Message")),o=y(String(i?.detail||"")),d=y(String(e?.body||"")),p={success:{border:"1px solid rgba(34,197,94,0.20)",bg:"rgba(34,197,94,0.06)"},warning:{border:"1px solid rgba(245,158,11,0.20)",bg:"rgba(245,158,11,0.06)"},info:{border:"1px solid rgba(96,165,250,0.20)",bg:"rgba(96,165,250,0.06)"},neutral:{border:"1px solid rgba(255,255,255,0.10)",bg:"rgba(255,255,255,0.04)"},default:{border:"1px solid rgba(255,255,255,0.10)",bg:"rgba(255,255,255,0.04)"}},m=p[s?.tone]||p.default;let g="";if(r==="progress_report"){const u=fe(e)||{};if(Object.keys(u).length){const f=u.skills||{},h=[["Read",`${f.read??0}%`],["Frame",`${f.framing??0}%`],["Delivery",`${f.delivery??0}%`],["Recovery",`${f.recovery??0}%`],["Closing",`${f.closing??0}%`]];g=`
        <div class="mb-progress-report-card">
          <div class="mb-progress-report-topline">
            <div class="mb-progress-report-pill">Encounter ${y(String(u.encounterNumber??"-"))}</div>
            <div class="mb-progress-report-pill">Signal ${y(String(u.chainSignal||"-"))}</div>
            <div class="mb-progress-report-pill">Score ${y(String(u.chainScore??"-"))}</div>
          </div>

          <div class="mb-progress-report-meta">
            Guest: <strong>${y(String(u.guestStateActual||"-"))}</strong>
            ${u.difficulty!=null?` • Difficulty: <strong>${y(String(u.difficulty))}</strong>`:""}
          </div>

          <div class="mb-progress-report-grid">
            ${h.map(([w,S])=>`
              <div class="mb-progress-report-metric">
                <div class="mb-progress-report-label">${y(w)}</div>
                <div class="mb-progress-report-value">${y(S)}</div>
              </div>
            `).join("")}
          </div>

          <div class="mb-progress-report-summary">
            <div><span class="mb-progress-report-key">Strongest</span> ${y(String(u.strongestSkill??"-"))}</div>
            <div><span class="mb-progress-report-key">Needs work</span> ${y(String(u.weakestSkill??"-"))}</div>
          </div>
        </div>
      `}}return`
    <div class="mb-message-card" data-msg-id="${y(String(e?.id??""))}" style="
      ${m.border};
      border-radius:12px;
      padding:10px;
      background:${m.bg};
      margin-bottom:8px;
    ">
      <div class="mb-message-head" style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <div class="small-text" style="opacity:.75;">${y(n)}</div>
        ${l?`<div>${l}</div>`:""}
      </div>
      <div class="mb-message-title-row" style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-top:6px;">
        <div class="mb-message-title" style="font-weight:600;">${c}</div>
        <div class="mb-message-date small-text" style="opacity:.6;">${a}</div>
      </div>
      ${o?`
        <div class="small-text" style="margin-top:4px; opacity:.82;">
          ${o}
        </div>
      `:""}
      ${r==="instruction"?`
        <div class="small-text" style="margin-top:6px; opacity:.92; white-space:pre-wrap;">
          ${d}
        </div>
      `:""}
      ${g}
    </div>
  `}function Mo(e={}){const t=String(e?.type||"").toLowerCase();return t==="drill_override"||t==="drill_started"||t==="drill_completed"||t==="timed_challenge"||t==="timed_challenge_completed"||t==="timed_challenge_expired"?"objective_timeline":t==="instruction"?"coaching_notes":t==="progress_report"?"performance_reports":"other"}function am(e={}){const t=String(e?.type||"").toLowerCase();return t?t==="drill_override"||t==="drill_started"||t==="drill_completed"?"template:drill":t==="timed_challenge"||t==="timed_challenge_completed"||t==="timed_challenge_expired"?"template:timed_challenge":t==="display_method_challenge"||t==="display_method_challenge_completed"||t==="display_method_challenge_expired"?"template:display_method_challenge":t==="progress_report"?"template:progress_report":t==="instruction"?"template:instruction":`row:${String(e?.id||"")}`:`row:${String(e?.id||"")}`}function Za(e=[]){const t=Array.isArray(e)?e:[],n=new Map;for(const r of t){const a=am(r),s=n.get(a);if(!s){n.set(a,r);continue}const i=new Date(r?.created_at||0).getTime(),l=new Date(s?.created_at||0).getTime();i>=l&&n.set(a,r)}return Array.from(n.values()).sort((r,a)=>new Date(r?.created_at||0)-new Date(a?.created_at||0))}function sm(e=[]){const t=Za(e);return t[t.length-1]||null}function im(e=""){const n={objective_timeline:"Objective Timeline",coaching_notes:"Coaching Notes",performance_reports:"Performance Reports",other:"Other Activity"}[e]||"Thread Activity";return`
    <div style="
      display:flex;
      align-items:center;
      gap:8px;
      margin:12px 0 6px 0;
    ">
      <div class="small-text" style="
        opacity:.78;
        font-weight:700;
        letter-spacing:.02em;
        white-space:nowrap;
      ">
        ${y(n)}
      </div>
      <div style="
        height:1px;
        flex:1;
        background:rgba(255,255,255,0.10);
      "></div>
    </div>
  `}function om(e=[],t={}){const n=Za(e);let r="",a="";for(const s of n){const i=Mo(s);i!==a&&(r+=im(i),a=i),r+=rm(s,t)}return r}function lm(e=[]){const t=Array.isArray(e)?e:[],n=[...t].filter(i=>String(i?.type||"")==="progress_report").sort((i,l)=>new Date(l?.created_at||0)-new Date(i?.created_at||0))[0]||null,r=[...t].filter(i=>Mo(i)==="objective_timeline").sort((i,l)=>new Date(l?.created_at||0)-new Date(i?.created_at||0))[0]||null,a=fe(n)||null,s=r?ts(r):null;return`
    <div style="font-weight:600;">Thread Snapshot</div>
    <div class="small-text" style="margin-top:6px; opacity:.75;">
      Objectives and performance reports now appear together in the activity feed below.
    </div>
    <div style="margin-top:10px; display:grid; gap:8px;">
      <div class="card" style="padding:10px;">
        <div style="font-weight:600;">Latest Objective</div>
        <div class="small-text" style="margin-top:6px; opacity:.82;">
          ${y(String(s?.title||"No objective activity yet."))}
        </div>
        ${s?.detail?`
          <div class="small-text" style="margin-top:4px; opacity:.7;">
            ${y(String(s.detail))}
          </div>
        `:""}
      </div>
      <div class="card" style="padding:10px;">
        <div style="font-weight:600;">Latest Performance Reflection</div>
        ${a?`
          <div class="small-text" style="margin-top:6px; opacity:.82;">
            Encounter ${y(String(a.encounterNumber??"-"))} •
            Guest ${y(String(a.guestStateActual||"-"))} •
            Signal ${y(String(a.chainSignal||"-"))}
          </div>
          <div class="small-text" style="margin-top:6px; opacity:.9;">
            Strongest: ${y(String(a.strongestSkill??"-"))} •
            Needs work: ${y(String(a.weakestSkill??"-"))}
          </div>
        `:`
          <div class="small-text" style="margin-top:6px; opacity:.75;">
            No performance report yet for this waiter.
          </div>
        `}
      </div>
    </div>
  `}function cm(e=[],t={}){const n=Za(e);return n.length?om(n,t):'<div class="small-text" style="opacity:.75;">No thread messages yet.</div>'}function dm(e,t){const n=String(window.__BC_MB_ACTIVE_THREAD_USER_ID__||"")===String(e.userId||""),r=y(String(e?.title||De(e.userId,t))),a=y(String(e.latestBody||"").slice(0,80)),s=y(String(e.latestAt||"")),i=y(String(mm(e?.latestType||"message")));return`
    <button
      type="button"
      class="btn-ghost"
      data-thread-user-id="${e.userId}"
      style="
        width:100%;
        text-align:left;
        border-radius:0;
        border:0;
        border-bottom:1px solid rgba(255,255,255,0.08);
        background:${n?"rgba(255,255,255,0.08)":"transparent"};
        padding:10px;
      ">
      <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
        <strong>${r}</strong>
        <span class="small-text" style="opacity:.6;">${s}</span>
      </div>
      <div class="small-text" style="margin-top:4px; opacity:.75;">${i}</div>
      <div class="small-text" style="margin-top:4px; opacity:.85;">${a}</div>
    </button>
  `}function um(e){const t=U("mbSuggestedPrompts");if(!t)return;const n=[...e?.rows||[]].sort((p,m)=>new Date(p.created_at)-new Date(m.created_at)),r=n[n.length-1],a=fe(r)||{},s=[],i=qu(e);i&&!i.cooldown&&s.unshift(`Assign ${i.label} drill (auto)`),i&&i.cooldown&&s.unshift(`Cooldown active: ${i.label} drill was assigned recently`);const l=String(a?.chainSignal||"").toLowerCase(),c=String(a?.guestStateActual||"").toLowerCase(),o=["Promo: lead with the featured wine first, then close the table with one clear next step.","Promo: keep the pitch simple, name the bottle, and give the guest one strong reason to buy it now."];l==="red"||l==="soft_close"?(s.push("Keep it shorter and confirm guest intent first."),s.push("Run a 5-minute Guest Reading drill before next shift."),s.push("Offer two confident options instead of over-explaining.")):(s.push("Good progress. Keep your close crisp and confident."),s.push("Stay concise and guide the guest to a decision.")),(c==="decider"||c==="dictator")&&s.push("With Dictators: lead quickly with two strong options.");const d=[...o,...s];window.__BC_MB_SELECTED_SUGGESTION__=d[0]||"",t.innerHTML=d.map(p=>`<button type="button" class="btn-ghost" data-suggested-prompt="${y(p)}">${y(p)}</button>`).join("")}function es(e={}){const t=String(e?.type||"").toLowerCase();return{drill_override:{badge:"ASSIGNED",tone:"neutral",title:"Assigned Drill"},drill_started:{badge:"STARTED",tone:"info",title:"Drill Started"},drill_completed:{badge:"COMPLETE",tone:"success",title:"Drill Completed"},timed_challenge:{badge:"CHALLENGE",tone:"neutral",title:"Timed Challenge Sent"},timed_challenge_completed:{badge:"WON",tone:"success",title:"Challenge Completed"},timed_challenge_expired:{badge:"EXPIRED",tone:"warning",title:"Challenge Expired"},instruction:{badge:"NOTE",tone:"neutral",title:"Instruction Sent"},progress_report:{badge:"REPORT",tone:"info",title:"Progress Report"}}[t]||{badge:"",tone:"default",title:""}}function mm(e=""){const t=String(e||"").toLowerCase();return{drill_override:"Drill Assigned",drill_started:"Drill Started",drill_completed:"Drill Done",timed_challenge:"Challenge Sent",timed_challenge_completed:"Challenge Won",timed_challenge_expired:"Challenge Expired",display_method_challenge:"Display Challenge",display_method_challenge_completed:"Display Won",display_method_challenge_expired:"Display Expired",instruction:"Instruction",progress_report:"Progress Update"}[t]||es({type:t})?.title||"Message"}function gm(e={}){const t=es(e);if(!t.badge)return"";const n={success:"background:rgba(34,197,94,0.16); border:1px solid rgba(34,197,94,0.35);",warning:"background:rgba(245,158,11,0.16); border:1px solid rgba(245,158,11,0.35);",info:"background:rgba(96,165,250,0.16); border:1px solid rgba(96,165,250,0.35);",neutral:"background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12);",default:"background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.10);"};return`
    <span style="
      display:inline-flex;
      align-items:center;
      padding:3px 8px;
      border-radius:999px;
      font-size:11px;
      font-weight:700;
      letter-spacing:.03em;
      ${n[t.tone]||n.default}
    ">
      ${y(t.badge)}
    </span>
  `}function ts(e={}){const t=String(e?.type||"").toLowerCase(),n=e?.payload||{};if(t==="drill_override"){const r=n?.drill||{},a=Ae(r?.focus||""),s=Number(r?.repTarget||r?.rep_target||0)||null,i=Number(r?.durationSec||r?.duration_sec||0)||null,l=i?Math.floor(i/60):null;return{title:`Assigned ${a} drill`,detail:[s?`${s} reps`:"",l?`${l} min`:""].filter(Boolean).join(" • ")}}if(t==="drill_started"){const r=Ae(n?.focus||""),a=Number(n?.repTarget||0)||null,s=Rn(n?.startedAt||e?.created_at);return{title:`Started ${r} drill`,detail:[a?`${a} reps`:"",s||""].filter(Boolean).join(" • ")}}if(t==="drill_completed"){const r=Ae(n?.focus||""),a=Number(n?.repsDone||0)||null,s=Number(n?.repTarget||0)||null,i=Rn(n?.completedAt||e?.created_at);return{title:`Completed ${r} drill`,detail:[a&&s?`${a}/${s} reps`:"",i||""].filter(Boolean).join(" • ")}}if(t==="timed_challenge"){const r=_t(n),a=Number(n?.durationSec||0)||null,s=Number(n?.rewardPoints||0)||null,i=a?Math.floor(a/60):null;return{title:"Challenge Sent",detail:[r,i?`${i} min`:"",s?`Reward ${s}`:""].filter(Boolean).join(" • ")}}if(t==="timed_challenge_completed"){const r=_t(n),a=Number(n?.rewardPoints||0)||null,s=Xe(n?.outcome||"");return{title:`Completed ${r}`,detail:[n?.outcome?`Outcome: ${s}`:"",a?`Reward ${a}`:""].filter(Boolean).join(" • ")}}if(t==="timed_challenge_expired")return{title:"Challenge Expired",detail:[_t(n),"Time ran out"].filter(Boolean).join(" • ")};if(t==="instruction")return{title:"Instruction sent",detail:String(e?.body||"")};if(t==="progress_report"){const r=n?.encounterNumber??"—",a=String(n?.guestStateActual||"").trim(),s=String(n?.chainSignal||"").trim(),i=String(n?.performanceGrade||n?.grade||"").trim();return{title:`Encounter ${r} report`,detail:[a?`Guest: ${a}`:"",s?`Signal: ${s}`:"",i?`Grade: ${i}`:""].filter(Boolean).join(" • ")}}return{title:String(e?.body||"Message"),detail:""}}function _t(e={}){const t=String(e?.title||"").trim();if(t)return t;const n=String(e?.challengeKey||"").trim().toLowerCase();return Xe(n||"challenge")}function pm(e=[]){const t=Array.isArray(e)?e:[],n=[...t].filter(f=>String(f?.type||"")==="timed_challenge").sort((f,h)=>new Date(f.created_at)-new Date(h.created_at)).slice(-1)[0]||null,r=[...t].filter(f=>String(f?.type||"")==="timed_challenge_completed").sort((f,h)=>new Date(f.created_at)-new Date(h.created_at)).slice(-1)[0]||null,a=[...t].filter(f=>String(f?.type||"")==="timed_challenge_expired").sort((f,h)=>new Date(f.created_at)-new Date(h.created_at)).slice(-1)[0]||null,s=[...t].filter(f=>String(f?.type||"")==="drill_override").sort((f,h)=>new Date(f.created_at)-new Date(h.created_at)).slice(-1)[0]||null,i=[...t].filter(f=>String(f?.type||"")==="drill_started").sort((f,h)=>new Date(f.created_at)-new Date(h.created_at)).slice(-1)[0]||null,l=[...t].filter(f=>String(f?.type||"")==="drill_completed").sort((f,h)=>new Date(f.created_at)-new Date(h.created_at)).slice(-1)[0]||null,c=l?new Date(l.created_at||0).getTime():0,o=i?Number(i?.payload?.startedAt||0)||new Date(i.created_at||0).getTime():0,d=s?new Date(s.created_at||0).getTime():0,p=r?new Date(r.created_at||0).getTime():0,m=a?new Date(a.created_at||0).getTime():0,g=n?new Date(n.created_at||0).getTime():0,u=[];if(c&&c>=Math.max(o,d)){const f=l?.payload||{},h=Ae(f?.focus||"");u.push(`${h} drill completed`)}else if(o&&o>=d){const f=i?.payload||{},h=Ae(f?.focus||"");u.push(`${h} drill in progress`)}else if(d){const h=(s?.payload||{})?.drill||{},w=Ae(h?.focus||"");u.push(`${w} drill ready`)}if(p&&p>=Math.max(g,m)){const f=r?.payload||{},h=_t(f);u.push(`${h} completed`)}else if(m&&m>=g){const f=a?.payload||{},h=_t(f);u.push(`${h} expired`)}else if(g){const f=n?.payload||{},h=_t(f);u.push(`${h} active`)}return u.join(" • ")||"No current objective"}function Ae(e=""){const t=String(e||"").toLowerCase();return{read:"Read",frame:"Frame",delivery:"Delivery",recovery:"Recovery",closing:"Closing"}[t]||(e?String(e):"Drill")}function Rn(e){if(!e)return"";let t=Number(e);if((!Number.isFinite(t)||t<=0)&&(t=new Date(e).getTime()),!Number.isFinite(t)||t<=0)return"";try{return new Date(t).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}catch{return""}}function _m(){const e=window.__BC_PARENT_LAST_DRILL_STARTED__||null;if(!e)return null;const t=String(window.__BC_MB_ACTIVE_THREAD_USER_ID__||"");if(!t)return null;const n=String(e?.assignedMessageId||"");if(!n)return null;const a=(Array.isArray(window.__BC_MB_ACTIVE_THREAD_ROWS__)?window.__BC_MB_ACTIVE_THREAD_ROWS__:[]).find(l=>String(l?.id||"")===n&&String(l?.type||"")==="drill_override");if(!a)return null;const s=String(a?.receiver_user_id||"");if(s&&t&&s!==t)return null;const i=Number(e?.at||0);return $u(i,1e3*60*20)?{assignedMessageId:n,focus:String(e?.payload?.focus||""),repTarget:Number(e?.payload?.repTarget||0)||null,at:i}:null}function In(){const e=document.getElementById("mbThreadDrillSummary");if(!e)return;if(!String(window.__BC_MB_ACTIVE_THREAD_USER_ID__||"")){e.textContent="";return}const n=Array.isArray(window.__BC_MB_ACTIVE_THREAD_ROWS__)?window.__BC_MB_ACTIVE_THREAD_ROWS__:[],r=[...n].filter(o=>String(o?.type||"")==="drill_override").sort((o,d)=>new Date(o.created_at)-new Date(d.created_at)).slice(-1)[0]||null,a=[...n].filter(o=>String(o?.type||"")==="drill_completed").sort((o,d)=>new Date(o.created_at)-new Date(d.created_at)).slice(-1)[0]||null,s=[...n].filter(o=>String(o?.type||"")==="drill_started").sort((o,d)=>new Date(o.created_at)-new Date(d.created_at)).slice(-1)[0]||null,i=_m(),l=a?new Date(a.created_at||0).getTime():0,c=s?Number(s?.payload?.startedAt||0)||new Date(s.created_at||0).getTime():0;if(a&&l>=c){const o=a?.payload||{},d=Ae(o?.focus||""),p=Number(o?.repsDone||0)||null,m=Number(o?.repTarget||0)||null;e.innerHTML=`
      <span style="opacity:.95;">Last drill completed</span>
      ${d?`<span style="opacity:.75;"> • ${y(d)}</span>`:""}
      ${p&&m?`<span style="opacity:.7;"> • ${y(`${p}/${m} reps`)}</span>`:""}
    `;return}if(s){const o=s?.payload||{},d=Ae(o?.focus||""),p=Rn(o?.startedAt||s?.created_at);e.innerHTML=`
      <span style="opacity:.95;">Waiter started assigned drill</span>
      ${d?`<span style="opacity:.75;"> • ${y(d)}</span>`:""}
      ${p?`<span style="opacity:.7;"> • ${y(p)}</span>`:""}
    `;return}if(i){const o=Ae(i.focus),d=Rn(i.at);e.innerHTML=`
      <span style="opacity:.95;">Waiter started assigned drill</span>
      <span style="opacity:.75;"> • ${y(o)}</span>
      ${d?`<span style="opacity:.7;"> • ${y(d)}</span>`:""}
    `;return}if(r){const d=(r?.payload||{})?.drill||{},p=Ae(d?.focus||""),m=Number(d?.repTarget||d?.rep_target||0)||null;e.innerHTML=`
      <span style="opacity:.95;">Assigned drill ready</span>
      ${p?`<span style="opacity:.75;"> • ${y(p)}</span>`:""}
      ${m?`<span style="opacity:.7;"> • ${y(`${m} reps`)}</span>`:""}
    `;return}e.innerHTML=`
    <span style="opacity:.75;">No drill lifecycle yet for this waiter.</span>
  `}function yr(){const e=Ui(),t=Hi(),n=e?(()=>{const i=e?.payload?.drill||{},l=String(i?.focus||"-"),c=Number(i?.repTarget||0)||"-",o=Number(i?.durationSec||0)||0,d=gn?.(e)||mn(e?.receiver_user_id)||"Waiter";return`${l} • ${c} reps • ${o}s • ${d}`})():"None",r=t?(()=>{const i=t?.payload||{},l=String(i?.focus||"-"),c=Number(i?.repsDone||0),o=Number(i?.repTarget||0),d=Number(i?.durationSec||0),p=d?Math.floor(d/60):0,m=d?d%60:0,g=gn?.(t)||mn(t?.sender_user_id)||"Waiter";return`${l} • ${c}/${o} reps • ${p}m ${m}s • ${g}`})():"None",a=`
    <div><b>Last assigned:</b> ${y(n)}</div>
    <div style="margin-top:4px;"><b>Last completed:</b> ${y(r)}</div>
  `,s=U("mbDrillSummary");s&&(s.innerHTML=`
      <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
        <div style="font-weight:600;">Restaurant Drill Summary</div>
        ${a}
      </div>
    `)}function fm(){return yr?.()}function Cn(){const e=document.getElementById("mbPeopleSummary");if(!e)return;const t=Array.isArray(window.__BC_MB_STAFF_ROWS__)?window.__BC_MB_STAFF_ROWS__:[],n=t.filter(i=>F(i)==="waiter").length,r=t.length-n,s=Ja().filter(i=>String(i?.status||"")==="pending").length;e.innerHTML=`
    <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
      <div style="font-weight:600;">People</div>
      <div><b>Members:</b> ${t.length}</div>
      <div><b>Waiters:</b> ${n}</div>
      <div><b>Managers:</b> ${r}</div>
      <div><b>Pending invites:</b> ${s}</div>
    </div>
  `}function ve(){return window.__BC_MANAGER_LIVE_EFFECTS_STATE__||(window.__BC_MANAGER_LIVE_EFFECTS_STATE__={attributeEffects:[],areaEffects:[],updatedAt:Date.now()}),window.__BC_MANAGER_LIVE_EFFECTS_STATE__}function xo(){try{const t=(document.getElementById("bcPremiumFrame")||document.getElementById("premiumRootFrame"))?.contentWindow||null;if(!t)return!1;const n=ve();return t.postMessage({source:"BC_MSG",v:1,type:"live_effects_sync",attributeEffects:n.attributeEffects,areaEffects:n.areaEffects,epoch:Number(window.__BC_IFRAME_EPOCH__||0)},window.location.origin),!0}catch(e){return console.warn("[LIVE EFFECTS] push to game failed",e),!1}}function ym(e={}){const t=ve();return window.__BC_MANAGER_LIVE_EFFECTS_STATE__={attributeEffects:Array.isArray(e.attributeEffects)?e.attributeEffects:Array.isArray(t.attributeEffects)?t.attributeEffects:[],areaEffects:Array.isArray(e.areaEffects)?e.areaEffects:Array.isArray(t.areaEffects)?t.areaEffects:[],updatedAt:Date.now()},O("renderManagerLiveEffectsPanels",()=>Fi?.()),ce?.({thread:!1,board:!0,economy:!0,liveControls:!0,challengeMeta:!0}),O("pushLiveEffectsToGame",()=>xo?.()),window.__BC_MANAGER_LIVE_EFFECTS_STATE__}function hr(e={}){const t=ve();return ym({attributeEffects:e.attributeEffects??t.attributeEffects,areaEffects:e.areaEffects??t.areaEffects})}function de(){return window.__BC_MANAGER_ABILITY_ECONOMY__||(window.__BC_MANAGER_ABILITY_ECONOMY__={influence:5,maxInfluence:5,cooldowns:{},updatedAt:Date.now(),lastRegenAt:Date.now()}),window.__BC_MANAGER_ABILITY_ECONOMY__}function Tn(e={}){const t=de();return window.__BC_MANAGER_ABILITY_ECONOMY__={influence:Number.isFinite(e.influence)?Number(e.influence):t.influence,maxInfluence:Number.isFinite(e.maxInfluence)?Number(e.maxInfluence):t.maxInfluence,cooldowns:e.cooldowns&&typeof e.cooldowns=="object"?{...e.cooldowns}:{...t.cooldowns},updatedAt:Date.now(),lastRegenAt:Number.isFinite(e.lastRegenAt)?Number(e.lastRegenAt):Number(t.lastRegenAt||Date.now())},window.__BC_MANAGER_ABILITY_ECONOMY__}const sr=20,ns=2,bt=Object.freeze({closing_surge:2,recovery_focus:2,premium_window:3,calm_floor:2}),Hn=Object.freeze({closing_push:1,recovery_window:1,clean_close:2,read_first:1,full_delivery:1,no_reset_run:1,stable_signal:1,solid_interaction:1}),hm=Object.freeze({closing_surge:30,recovery_focus:30,premium_window:45,calm_floor:30}),wm=Object.freeze({closing_push:20,recovery_window:20,clean_close:30,read_first:15,full_delivery:15,no_reset_run:15,stable_signal:15,solid_interaction:15});function Bt(e=""){const t=de(),n=Number(t?.cooldowns?.[e]||0);return n?Math.max(0,Math.ceil((n-Date.now())/1e3)):0}function rs(e=""){return Bt(e)>0}function as(e=0){const t=de();return Number(t?.influence||0)>=Number(e||0)}function Lo(e=0){const t=de(),n=Math.max(0,Number(t.influence||0)-Number(e||0));Tn({...t,influence:n})}function ko(e="",t=0){if(!e||!t)return;const n=de(),r={...n.cooldowns||{}};r[e]=Date.now()+Number(t)*1e3,Tn({...n,cooldowns:r})}function No(){const e=de(),t=Date.now(),n=Number(e?.lastRegenAt||e?.updatedAt||t),r=Number(e?.influence||0),a=Number(e?.maxInfluence||5);if(r>=a){e.lastRegenAt||Tn({...e,lastRegenAt:t});return}const s=Math.floor((t-n)/1e3);if(s<sr)return;const i=Math.floor(s/sr),l=Math.min(a,r+i),c=i*sr*1e3;Tn({...e,influence:l,lastRegenAt:n+c})}function bm(){window.__BC_MANAGER_INFLUENCE_TICKER__||(window.__BC_MANAGER_INFLUENCE_TICKER__=setInterval(()=>{try{const e=Number(de()?.influence||0);No(),Number(de()?.influence||0)!==e&&(O("renderManagerActiveThread",()=>St(new Map)),ce?.())}catch(e){console.warn("[ECONOMY] regen tick failed",e)}},1e3))}function An(e=0){return`${Number(e||0)} inf`}function vm(e=""){const t=Bt(e);return t>0?`${t}s cd`:""}function Bn(e="",t=0){const n=vm(e),r=An(t);return n?`${r} • ${n}`:r}function vt({key:e="",cost:t=0,type:n="challenge"}={}){return rs(e)?`Cooldown ${Bt(e)}s`:as(t)?n==="effect"&&!ss()?"Live effect cap reached":"":"Not enough influence"}function Po(){const e=ve(),t=Array.isArray(e?.attributeEffects)?e.attributeEffects.filter(r=>!!r?.active).length:0,n=Array.isArray(e?.areaEffects)?e.areaEffects.filter(r=>!!r?.active).length:0;return t+n}function ss(){return Po()<ns}function Sm(){return`${Po()} / ${ns}`}function Em(){const e=de();Tn({...e,influence:e.maxInfluence}),is?.()}function Rm(){const e=document.getElementById("mbRefillInfluence");!e||e.__wired||(e.__wired=!0,e.addEventListener("click",()=>{Em()}))}function is(){const e=document.getElementById("mbOverviewAbilityEconomy");if(!e)return;No?.(),bm?.();const t=de(),n=Math.max(0,sr-Math.floor((Date.now()-Number(t?.lastRegenAt||Date.now()))/1e3));e.innerHTML=`
    <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <div style="font-weight:600;">Manager Influence</div>
        <button id="mbRefillInfluence" class="btn-ghost" type="button">Refill</button>
      </div>

      <div class="small-text" style="opacity:.8;">
        Spend influence on live effects and timed challenges.
      </div>

      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <div style="
          padding:8px 10px;
          border:1px solid rgba(255,255,255,0.10);
          border-radius:999px;
        " class="small-text">
          Influence: ${y(String(t.influence))} / ${y(String(t.maxInfluence))}
        </div>
        <div style="
          padding:8px 10px;
          border:1px solid rgba(255,255,255,0.10);
          border-radius:999px;
        " class="small-text">
          Next regen: ${y(String(n))}s
        </div>
        <div style="
          padding:8px 10px;
          border:1px solid rgba(255,255,255,0.10);
          border-radius:999px;
        " class="small-text">
          Live Effects: ${y(Sm())}
        </div>
      </div>
    </div>
  `,Rm?.()}function wr(e){const t=String(e?.id||""),n=Number(bt?.[t]||0),r=Number(hm?.[t]||0);if(rs(t)){const a=Bt(t);return window.showToast?.(`${e?.name||t} is on cooldown (${a}s)`),!1}return ss()?as(n)?(Lo(n),ko(t,r),ce?.({thread:!1,board:!0,economy:!0,liveControls:!0,challengeMeta:!1}),!0):(window.showToast?.(`Not enough influence for ${e?.name||t}`),!1):(window.showToast?.(`Max live effects active (${ns}). Remove one first.`),!1)}function Do(e={}){return{id:String(e.id||`effect_${Math.random().toString(16).slice(2)}`),name:String(e.name||"Effect"),description:String(e.description||""),active:e.active!==!1,scope:String(e.scope||"attribute"),kind:String(e.kind||"manual"),createdAt:Date.now()}}function Ys(e){const n=[...ve().attributeEffects||[],Do({...e,scope:"attribute"})];hr({attributeEffects:n})}function zs(e){const n=[...ve().areaEffects||[],Do({...e,scope:"area"})];hr({areaEffects:n})}function Oo(e){const t=String(e?.id||""),n=String(e?.name||t||"Effect"),r=String(e?.description||""),a=!!e?.active,s=String(e?.kind||"");return`
    <div
      style="
        padding:10px;
        border:1px solid rgba(255,255,255,0.10);
        border-radius:10px;
        background:${a?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.03)"};
      "
    >
      <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
        <div>
          <div style="font-weight:600;">${y(n)}</div>
          <div class="small" style="opacity:.8; margin-top:4px;">
            ${y(r||"No description.")}
          </div>
        </div>
        <div class="small" style="opacity:.75;">${y(s)}</div>
      </div>

      <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
        <button type="button" class="btn-ghost" data-effect-toggle="${y(t)}">
          ${a?"Disable":"Enable"}
        </button>
        <button type="button" class="btn-ghost" data-effect-remove="${y(t)}">
          Remove
        </button>
      </div>
    </div>
  `}function $o(){document.querySelectorAll("[data-effect-toggle]").forEach(e=>{e.__wired||(e.__wired=!0,e.addEventListener("click",()=>{const t=String(e.getAttribute("data-effect-toggle")||"");if(!t)return;const n=ve(),r=(n.attributeEffects||[]).map(s=>String(s?.id||"")===t?{...s,active:!s?.active}:s),a=(n.areaEffects||[]).map(s=>String(s?.id||"")===t?{...s,active:!s?.active}:s);hr({attributeEffects:r,areaEffects:a})}))}),document.querySelectorAll("[data-effect-remove]").forEach(e=>{e.__wired||(e.__wired=!0,e.addEventListener("click",()=>{const t=String(e.getAttribute("data-effect-remove")||"");if(!t)return;const n=ve();hr({attributeEffects:(n.attributeEffects||[]).filter(r=>String(r?.id||"")!==t),areaEffects:(n.areaEffects||[]).filter(r=>String(r?.id||"")!==t)})}))})}function Im(){const e=document.getElementById("btnAddClosingSurge");e&&!e.__wired&&(e.__wired=!0,e.addEventListener("click",()=>{const n={id:"closing_surge",name:"Closing Surge",kind:"attribute",description:"Improves closing pressure conversion for the current encounter window.",active:!0};wr(n)&&Ys(n)}));const t=document.getElementById("btnAddRecoveryFocus");t&&!t.__wired&&(t.__wired=!0,t.addEventListener("click",()=>{const n={id:"recovery_focus",name:"Recovery Focus",kind:"attribute",description:"Improves recovery-related response shaping during tense guest states.",active:!0};wr(n)&&Ys(n)})),$o?.()}function Cm(){const e=document.getElementById("btnAddPremiumWindow");e&&!e.__wired&&(e.__wired=!0,e.addEventListener("click",()=>{const n={id:"premium_window",name:"Premium Window",kind:"area",description:"Improves premium-upgrade opportunity during the active encounter phase.",active:!0};wr(n)&&zs(n)}));const t=document.getElementById("btnAddCalmFloor");t&&!t.__wired&&(t.__wired=!0,t.addEventListener("click",()=>{const n={id:"calm_floor",name:"Calm Floor",kind:"area",description:"Reduces pressure escalation and stabilizes the encounter atmosphere.",active:!0};wr(n)&&zs(n)})),$o?.()}function Uo(){const e=document.getElementById("mbAttributeAbilitiesPanel");if(!e)return;const t=ve(),n=Array.isArray(t.attributeEffects)?t.attributeEffects:[],r="closing_surge",a="recovery_focus",s=Number(bt?.[r]||0),i=Number(bt?.[a]||0),l=Bn(r,s),c=Bn(a,i),o=vt({key:r,cost:s,type:"effect"}),d=vt({key:a,cost:i,type:"effect"});e.innerHTML=`
    <div class="card">
      <div style="font-weight:600; margin-bottom:8px;">Attribute Effects</div>
      <div class="small" style="opacity:.75; margin-bottom:8px;">
        Tactical, targeted effects that influence player-facing encounter attributes.
      </div>

      <div style="display:flex; flex-direction:column; gap:8px;">
        ${n.length?n.map(Oo).join(""):`
          <div class="small" style="opacity:.75;">No attribute effects loaded.</div>
        `}
      </div>

      <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
        <button
          type="button"
          class="btn-ghost"
          id="btnAddClosingSurge"
          ${o?"disabled":""}
          style="${o?"opacity:.6; cursor:not-allowed;":""}"
          title="${y(o||"Ready")}"
        >
          Closing Surge
          <span class="small-text" style="opacity:.7;"> • ${y(l)}</span>
        </button>

        <button
          type="button"
          class="btn-ghost"
          id="btnAddRecoveryFocus"
          ${d?"disabled":""}
          style="${d?"opacity:.6; cursor:not-allowed;":""}"
          title="${y(d||"Ready")}"
        >
          Recovery Focus
          <span class="small-text" style="opacity:.7;"> • ${y(c)}</span>
        </button>
      </div>

      <div class="small-text" style="opacity:.72; margin-top:8px;">
        ${y(o||d||"Ready to activate an attribute effect.")}
      </div>
    </div>
  `,Im?.()}function Ho(){const e=document.getElementById("mbAreaAbilitiesPanel");if(!e)return;const t=ve(),n=Array.isArray(t.areaEffects)?t.areaEffects:[],r="premium_window",a="calm_floor",s=Number(bt?.[r]||0),i=Number(bt?.[a]||0),l=Bn(r,s),c=Bn(a,i),o=vt({key:r,cost:s,type:"effect"}),d=vt({key:a,cost:i,type:"effect"});e.innerHTML=`
    <div class="card">
      <div style="font-weight:600; margin-bottom:8px;">Area Effects</div>
      <div class="small" style="opacity:.75; margin-bottom:8px;">
        Broader environmental effects that shape the encounter atmosphere.
      </div>

      <div style="display:flex; flex-direction:column; gap:8px;">
        ${n.length?n.map(Oo).join(""):`
          <div class="small" style="opacity:.75;">No area effects loaded.</div>
        `}
      </div>

      <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
        <button
          type="button"
          class="btn-ghost"
          id="btnAddPremiumWindow"
          ${o?"disabled":""}
          style="${o?"opacity:.6; cursor:not-allowed;":""}"
          title="${y(o||"Ready")}"
        >
          Premium Window
          <span class="small-text" style="opacity:.7;"> • ${y(l)}</span>
        </button>

        <button
          type="button"
          class="btn-ghost"
          id="btnAddCalmFloor"
          ${d?"disabled":""}
          style="${d?"opacity:.6; cursor:not-allowed;":""}"
          title="${y(d||"Ready")}"
        >
          Calm Floor
          <span class="small-text" style="opacity:.7;"> • ${y(c)}</span>
        </button>
      </div>

      <div class="small-text" style="opacity:.72; margin-top:8px;">
        ${y(o||d||"Ready to activate an area effect.")}
      </div>
    </div>
  `,Cm?.()}function Mn(){O("renderManagerAbilityEconomyPanel",()=>is?.()),O("renderManagerAttributeEffectsPanel",()=>Uo?.()),O("renderManagerAreaEffectsPanel",()=>Ho?.()),O("renderManagerTimedChallengeActionPanel",()=>Qo?.()),O("renderManagerDrillActionPanel",()=>Km?.())}function Go(){const e=_?.profile||{},t=_?.restaurant||{},n=rt(e),r=document.getElementById("profileDisplayName"),a=document.getElementById("profileRole"),s=document.getElementById("profileRestaurant"),i=document.getElementById("profileScopeType"),l=document.getElementById("profileScopeId"),c=document.getElementById("profileAccessTier"),o=document.getElementById("profileStandingCard"),d=document.getElementById("profileBadgeShelf"),p=document.getElementById("profileInsightCard"),m=document.getElementById("profileTutorialCard");if(r&&(r.textContent=e?.display_name||e?.displayName||_?.session?.user?.email||"-"),a&&(a.textContent=n||"-"),s&&(s.textContent=t?.name||t?.id||"-"),i&&(i.textContent=e?.scope_type||e?.scopeType||"-"),l&&(l.textContent=e?.scope_id||e?.scopeId||"-"),c&&(c.textContent=e?.access_tier||e?.accessTier||"-"),o&&(o.innerHTML=`
      <div class="card">
        <div style="font-weight:600; margin-bottom:8px;">My Standing</div>
        <div class="small" style="opacity:.75;">Loading rank and badge status…</div>
      </div>
    `),d&&(d.innerHTML=""),p&&(p.innerHTML=""),m){const u=String(F(e)||e?.role||"waiter").toLowerCase(),f=J(e);if(u==="waiter"||!f.canAccessManagerBoard||!e?.role&&!e?.membership_role&&!e?.membershipRole){m.classList.remove("hidden"),m.style.display="";const w=document.getElementById("profileTutorialCopy");w&&(w.textContent="Launch guided tutorials directly from your profile.");const S=document.getElementById("btnProfileEncounterTutorial");S&&(S.textContent="Start Encounter Tutorial",S.onclick=()=>{ka({resetConfig:!0}),Br?.(),Ic("encounter_setup_manager")})}else m.classList.add("hidden"),m.style.display="none"}const g=document.getElementById("profileMultiRestaurantCard");if(g)if(!J(e).canManageMultipleRestaurants)g.innerHTML="";else{const f=Un?.()||[];g.innerHTML=`
        <div class="card">
          <div style="font-weight:600; margin-bottom:8px;">Managed Restaurants</div>
          ${f.length?f.map(h=>`<div class="small">${y(h?.name||h?.id||"-")}</div>`).join(""):'<div class="small" style="opacity:.75;">No restaurant scope loaded.</div>'}
        </div>
      `}Lm()}function Wo(e){const t=Number(e||0);if(!Number.isFinite(t)||t<=0)return"—";const n=t%100;if(n>=11&&n<=13)return`${t}th`;const r=t%10;return r===1?`${t}st`:r===2?`${t}nd`:r===3?`${t}rd`:`${t}th`}function Tm(e={},t=0){const n=Number(e?.rank||0),r=Number(e?.percentile||0),a=Number(e?.readiness||0),s=Number(e?.challengeReadiness||0),i=Number(e?.totalPoints||0),l=Number(e?.drillPassRate||0),c=Number(e?.challengeSuccessRate||0),o=Number(e?.premiumSuccessRate||0),d=Number(e?.encounterPassRate||0),p=Number(e?.drillCompletedCount||0),m=Number(e?.challengeCompletedCount||0),g=Number(e?.encounterCount||0);return[{title:"Leaderboard Leader",earned:!!n&&n===1&&t>1,tone:"gold",detail:t>1?"Currently #1 in this restaurant.":"No cohort available yet."},{title:"Top Three",earned:!!n&&n<=3&&t>=3,tone:"emerald",detail:n?`Holding ${Wo(n)} place.`:"No rank yet."},{title:"Hundred Point Club",earned:i>=100,tone:"blue",detail:`${tt(i,1)} pts earned.`},{title:"Challenge Ready",earned:s>=.7,tone:"violet",detail:`Challenge readiness ${q(s)}.`},{title:"Stable Window",earned:a>=.8,tone:"emerald",detail:`Readiness ${q(a)} with a stable profile.`},{title:"Perfect Drill Day",earned:p>0&&l>=1,tone:"amber",detail:`${p} drill${p===1?"":"s"} completed at ${q(l)}.`},{title:"Challenge Closer",earned:m>=1&&c>=.5,tone:"rose",detail:`${m} completed challenge${m===1?"":"s"}.`},{title:"Premium Moment",earned:o>0,tone:"gold",detail:`Premium success rate ${q(o)}.`},{title:"Live Floor Builder",earned:g>=10&&d>=.5,tone:"blue",detail:`${g} encounters with ${q(d)} pass rate.`},{title:"Top Quartile",earned:r>=.75&&t>=4,tone:"violet",detail:`Top ${Math.max(1,Math.round((1-r)*100))}% of the restaurant cohort.`}]}function Am(e=null,t=null){const n=document.getElementById("profileStandingCard");if(!n)return;if(!e){n.innerHTML=`
      <div class="card">
        <div style="font-weight:600; margin-bottom:8px;">My Standing</div>
        <div class="small" style="opacity:.75;">Restaurant ranking is not available for this role yet.</div>
      </div>
    `;return}const r=Array.isArray(t?.users)?t.users.length:0,a=r?`Top ${Math.max(1,Math.round((1-Number(e.percentile||0))*100))}%`:"Solo profile";n.innerHTML=`
    <div class="card" style="display:flex; flex-direction:column; gap:10px;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div style="font-weight:600;">My Standing</div>
        <span class="badge">Rank ${Wo(e.rank)}</span>
      </div>
      <div style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px;">
        <div class="card" style="padding:10px;">
          <div class="small-text">Restaurant Rank</div>
          <strong>#${y(String(e.rank||"—"))}</strong>
          <div class="small-text" style="opacity:.72; margin-top:4px;">of ${y(String(r||1))}</div>
        </div>
        <div class="card" style="padding:10px;">
          <div class="small-text">Percentile</div>
          <strong>${y(a)}</strong>
          <div class="small-text" style="opacity:.72; margin-top:4px;">based on current restaurant peers</div>
        </div>
        <div class="card" style="padding:10px;">
          <div class="small-text">Points</div>
          <strong>${y(tt(e.totalPoints,1))}</strong>
          <div class="small-text" style="opacity:.72; margin-top:4px;">Tier ${y(String(e.servedTier||e.eligibilityTier||1))}</div>
        </div>
        <div class="card" style="padding:10px;">
          <div class="small-text">Readiness</div>
          <strong>${y(q(e.readiness))}</strong>
          <div class="small-text" style="opacity:.72; margin-top:4px;">${y(Ya(e.readiness,e.readinessLabel))}</div>
        </div>
      </div>
    </div>
  `}function Bm(e=null,t=null){const n=document.getElementById("profileBadgeShelf");if(!n)return;if(!e){n.innerHTML="";return}const r=Array.isArray(t?.users)?t.users.length:0,a=Tm(e,r),s=a.filter(o=>o.earned),i=a.filter(o=>!o.earned).slice(0,3),l={gold:"rgba(214,166,56,0.16)",emerald:"rgba(54,170,116,0.16)",blue:"rgba(66,124,221,0.16)",violet:"rgba(122,93,214,0.16)",rose:"rgba(209,92,124,0.16)",amber:"rgba(214,140,56,0.16)"},c=(o,d=!1)=>`
    <div class="card" style="padding:10px; border:1px solid rgba(255,255,255,0.08); background:${d?"rgba(255,255,255,0.03)":l[o.tone]||"rgba(255,255,255,0.05)"};">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <strong>${y(o.title)}</strong>
        <span class="badge">${d?"In Progress":"Earned"}</span>
      </div>
      <div class="small-text" style="margin-top:6px; opacity:.78;">${y(o.detail)}</div>
    </div>
  `;n.innerHTML=`
    <div class="card" style="display:flex; flex-direction:column; gap:10px;">
      <div style="font-weight:600;">Badges & Milestones</div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px;">
        ${(s.length?s:a.slice(0,2)).map(o=>c(o,!o.earned)).join("")}
      </div>
      ${i.length?`
        <div>
          <div class="small-text" style="margin-bottom:8px; opacity:.78;">Next up</div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px;">
            ${i.map(o=>c(o,!0)).join("")}
          </div>
        </div>
      `:""}
    </div>
  `}function Mm(e=null){const t=document.getElementById("profileInsightCard");if(t){if(!e){t.innerHTML="";return}t.innerHTML=`
    <div class="card" style="display:flex; flex-direction:column; gap:10px;">
      <div style="font-weight:600;">How You’re Known</div>
      <div style="display:flex; flex-wrap:wrap; gap:8px;">
        <span class="mb-badge">Strongest: ${y(e.strongestSkill||"—")}</span>
        <span class="mb-badge">Weakest: ${y(e.weakestSkill||"—")}</span>
        <span class="mb-badge">Challenge Readiness: ${y(q(e.challengeReadiness))}</span>
        <span class="mb-badge">Mastery: ${y(q(e.masteryRate))}</span>
        <span class="mb-badge">Last Active: ${y(wt(e.lastActiveAt))}</span>
      </div>
    </div>
  `}}async function xm(){const e=_?.profile||{},t=String(e?.user_id||e?.userId||_?.session?.user?.id||""),n=String(e?.restaurant_id||_?.activeRestaurantId||_?.restaurant?.id||"").trim();if(!t||!n)return null;const r=new Date(Date.now()-720*60*60*1e3).toISOString(),[a,s,i,l,c]=await Promise.all([window.__BC_GET_PROGRESSION_SNAPSHOT__?.({targetUserId:t,restaurantId:n}),tl(),I.from("bc_readiness_v1").select("*").eq("user_id",t).eq("restaurant_id",n).maybeSingle(),I.from("bc_encounter_resolutions_v2").select("occurred_at, performance_grade, chain_signal, chain_score, is_green, is_red, tier").eq("user_id",t).eq("restaurant_id",n).neq("mode","demo").gte("occurred_at",r).order("occurred_at",{ascending:!1}).limit(200),I.from("bc_messages_v1").select("created_at, type, payload").eq("sender_user_id",t).eq("restaurant_id",n).in("type",["drill_completed","timed_challenge_completed","timed_challenge_expired"]).is("archived_at",null).order("created_at",{ascending:!1}).limit(200)]),o=i?.data||{},d=Array.isArray(l?.data)?l.data:[],p=Array.isArray(c?.data)?c.data:[],m=a?.canonical_state&&typeof a.canonical_state=="object"?a.canonical_state:{},g=m?.economy&&typeof m.economy=="object"?m.economy:{},u=m?.authority&&typeof m.authority=="object"?m.authority:{},f=Math.max(0,Number(g?.points||0)),h=Math.max(1,Math.min(3,Math.round(me(u?.tierToServe,g?.tier,1)||1))),w=p.filter(N=>String(N?.type||"")==="drill_completed"),S=w.filter(N=>{const re=Number(N?.payload?.repsDone||0),Re=Number(N?.payload?.repTarget||0);return Re>0&&re>=Re}).length,E=p.filter(N=>String(N?.type||"")==="timed_challenge_completed"),b=p.filter(N=>String(N?.type||"")==="timed_challenge_expired"),B=E.length+b.length,L=d.filter(N=>{const re=String(N?.performance_grade||"").toUpperCase();return re==="A"||re==="B"||String(N?.chain_signal||"").toLowerCase()==="green"||!!N?.is_green}).length,k=d.filter(N=>String(N?.performance_grade||"").toUpperCase()==="A").length,v=E.filter(N=>!!N?.payload?.premiumSuccess).length,R=w.length?S/w.length:0,T=d.length?L/d.length:0,A=B?E.length/B:0,W=E.length?v/E.length:0,H=d.length?k/d.length:0,P=me(o?.readiness_score,o?.readiness_pct),C=Math.max(0,Math.min(1,me(P!=null?P>1?P/100:P:null,H,f>=10?.8:f>=5?.62:.4)||0)),D=pt(o?.readiness,C>=.8?"STABLE":C>=.62?"GROWING":"FRAGILE"),V=Math.max(0,Math.min(1,C*.45+T*.35+A*.2)),M=za(s);return{userId:t,displayName:String(e?.display_name||e?.displayName||_?.session?.user?.email||"You"),totalPoints:f,drillPassRate:R,drillCompletedCount:w.length,drillPasses:S,encounterPassRate:T,encounterCount:d.length,challengeSuccessRate:A,challengeCompletedCount:E.length,challengeExpiredCount:b.length,challengeCount:B,premiumSuccessRate:W,masteryRate:H,lastActiveAt:pt(a?.updated_at,d[0]?.occurred_at,p[0]?.created_at),eligibilityTier:h,readiness:C,readinessLabel:D,servedTier:h,challengeReadiness:V,percentile:0,rank:null,strongestSkill:M.strongestSkill,weakestSkill:M.weakestSkill,skillShape:s}}async function Lm(){const e=document.getElementById("profileStandingCard"),t=document.getElementById("profileBadgeShelf"),n=document.getElementById("profileInsightCard");if(!(!e&&!t&&!n))try{const r=_?.profile||{},a=String(r?.user_id||r?.userId||_?.session?.user?.id||"");let s=null,i=null;try{s=await bn(),i=(s?.users||[]).find(l=>String(l?.userId||"")===a)||null}catch(l){console.warn("[PROFILE] manager performance model unavailable, using self fallback",l)}i||(i=await xm()),Am(i,s),Bm(i,s),Mm(i)}catch(r){console.warn("[PROFILE] performance card render failed",r),e&&(e.innerHTML=`
        <div class="card">
          <div style="font-weight:600; margin-bottom:8px;">My Standing</div>
          <div class="small" style="opacity:.75;">Could not load ranking right now.</div>
        </div>
      `),t&&(t.innerHTML=""),n&&(n.innerHTML="")}}function St(e){const t=U("mbThreadMessages"),n=U("mbThreadTimelinePanel"),r=U("mbThreadTitle"),a=U("mbThreadMeta"),s=U("mbThreadStatePanel"),i=U("mbThreadChallengeRecommendations"),l=window.__BC_MB_ACTIVE_THREAD_USER_ID__,o=(window.__BC_MB_THREADS__||[]).find(p=>String(p.userId)===String(l));if(!o){r&&(r.textContent="Select a waiter"),a&&(a.textContent=""),n&&(n.innerHTML=`
        <div style="font-weight:600;">Thread Snapshot</div>
        <div class="small-text" style="margin-top:6px; opacity:.75;">
          Select a waiter to view the latest objective and performance reflection.
        </div>
      `),t&&(t.innerHTML='<div class="small-text" style="opacity:.8;">Select a waiter thread in this restaurant to assign a timed challenge.</div>'),s&&(s.innerHTML=`
        <div style="font-weight:600;">Current Coaching State</div>
        <div class="small-text" style="margin-top:6px; opacity:.75;">
          Select a waiter to view current objective state.
        </div>
      `),i&&(i.innerHTML=`
        <div class="small-text" style="opacity:.75;">
          Select a waiter to view recommendations.
        </div>
      `),nt({userId:"",rows:[]}),O("renderManagerThreadDrillSummary",()=>In?.());return}const d=[...o.rows].sort((p,m)=>new Date(p.created_at)-new Date(m.created_at));if(nt({userId:o.userId,rows:d}),r&&(r.textContent=String(o?.title||De(o.userId,e))),a&&(a.textContent=pm(d)),n&&(n.innerHTML=O("renderManagerThreadSnapshot",()=>lm(d))||`
      <div style="font-weight:600;">Thread Snapshot</div>
      <div class="small-text" style="margin-top:6px; opacity:.75;">
        Unable to build thread snapshot.
      </div>
    `),t){const p=O("renderManagerThreadBody",()=>cm(d,e))||"";t.innerHTML=p,t.scrollTop=0,O("wireMbCoachSuggestionButtons",()=>Ca()),O("wireMbAutoDrillButtons",()=>em()),O("wireManagerChallengeSuggestionButtons",()=>To()),setTimeout(()=>{const m=t.querySelectorAll(".mbSkillRadar"),g=d.filter(u=>!!fe(u)?.skills);m.forEach((u,f)=>{const h=g[f],w=fe(h);w?.skills&&Ta(u,w.skills)})},0)}O("buildManagerSuggestedPrompts",()=>um(o)),O("renderManagerThreadDrillSummary",()=>In?.()),O("renderManagerThreadStatePanel",()=>Ju?.()),O("renderManagerThreadRecommendationsPanel",()=>Xu?.(o))}function Qs(e,t){U("mbThreadList");const n=U("mbThreadEmpty");if(U("mbThreadMessages"),U("mbThreadTitle"),U("mbThreadMeta"),window.__MB_LAST_MESSAGES__=t,window.__BC_MB_MESSAGES__=t,window.__BC_MESSENGER_ROWS__=t,window.__BC_MB_TIMED_CHALLENGE_ROWS__=$i(),window.__BC_MB_LAST_TIMED_CHALLENGE_RESULT__=Ga(),window.__BC_MB_LAST_DRILL_ASSIGNMENT__=Ui(),window.__BC_MB_LAST_DRILL_COMPLETION__=Hi(),Kt(),Yo(),fr?.(),!t.length)return Ee({keepStatus:!0}),n&&(n.style.display="block"),[];const r=_?.session?.user?.id||_?.session?.userId||null,a=new Map;for(const i of t){const l=i.sender_user_id,c=i.receiver_user_id;let o=String(l)===String(r)?c:l,d="",p=!1;if(!o&&String(i?.type||"").toLowerCase()==="progress_report"&&(o=r,d="Your Play",p=!0),!o)continue;const m=a.get(o)||{userId:o,title:d,isSelfThread:p,latestAt:i.created_at,latestBody:"",latestType:i.type||"message",rows:[]};m.rows.push(i),!m.title&&d&&(m.title=d),p&&(m.isSelfThread=!0),a.set(o,m)}const s=Array.from(a.values()).map(i=>{const l=sm(i.rows),c=l?ts(l):null;return{...i,latestAt:l?.created_at||i.latestAt,latestType:l?.type||i.latestType||"message",latestBody:String(c?.title||l?.body||i.latestBody||"")}}).sort((i,l)=>new Date(l.latestAt)-new Date(i.latestAt));return window.__BC_MB_THREADS_ALL__=Array.isArray(s)?s:[],window.__BC_MB_THREADS__=Array.isArray(s)?s:[],window.__BC_MB_MESSAGES__=Array.isArray(t)?t:[],window.__BC_MESSENGER_ROWS__=Array.isArray(t)?t:[],window.__BC_MB_ACTIVE_THREAD_RESTAURANT_ID__=e,window.__BC_MB_THREADS__.length||Ee({keepStatus:!0}),window.__BC_MB_THREADS__}async function Be(e=null,t={}){const n=String(e||j()||""),r=_?.profile||{},a=J(r),s=!!t?.force;if(!n)return Ee({keepStatus:!0}),[];if(!a.canAccessManagerBoard)return Ee({keepStatus:!0}),[];if(Na(Pt,Lc,n)&&!s){const w=Array.isArray(Pt.rows)?Pt.rows:[],S=Qs(n,w),E=(S||[]).map(B=>B.userId),b=await se(E);return En(window.__BC_MB_THREADS_ALL__||S,b),!window.__BC_MB_ACTIVE_THREAD_USER_ID__&&window.__BC_MB_THREADS?.[0]&&nt({userId:window.__BC_MB_THREADS[0].userId,rows:window.__BC_MB_THREADS[0].rows||[]}),js(),O("renderManagerActiveThread",()=>St(b)),Rt(),Ca(),ce?.({thread:!0,board:!0,economy:!1,liveControls:!1,challengeMeta:!0}),window.__BC_MB_THREADS__}if(!Me(r,r,n))return Ee({keepStatus:!0}),[];const i=U("mbThreadList"),l=U("mbThreadEmpty"),c=U("mbThreadMessages"),o=U("mbThreadTitle"),d=U("mbThreadMeta");i&&(i.innerHTML='<div class="small-text" style="padding:10px; opacity:.85;">Loading…</div>'),l&&(l.style.display="none"),c&&(c.innerHTML='<div class="small-text" style="opacity:.8;">Select a waiter thread in this restaurant to assign a timed challenge.</div>'),o&&(o.textContent="Select a waiter"),d&&(d.textContent="");const{data:p,error:m}=await I.from("bc_messages_v1").select("id, created_at, scope_type, scope_id, restaurant_id, sender_user_id, receiver_user_id, sender_role, type, body, payload, read_at").eq("restaurant_id",n).is("archived_at",null).order("created_at",{ascending:!1}).limit(200);if(m)throw m;const g=p||[];Pt={rid:n,loadedAt:Date.now(),rows:g};const u=Qs(n,g);if(!u.length)return u;const f=u.map(w=>w.userId),h=await se(f);return En(window.__BC_MB_THREADS_ALL__||u,h),!window.__BC_MB_ACTIVE_THREAD_USER_ID__&&window.__BC_MB_THREADS__[0]&&nt({userId:window.__BC_MB_THREADS__[0].userId,rows:window.__BC_MB_THREADS__[0].rows||[]}),js(),O("renderManagerActiveThread",()=>St(h)),Rt(),Ca(),ce?.({thread:!0,board:!0,economy:!1,liveControls:!1,challengeMeta:!0}),window.__BC_MB_THREADS__}function Fo(){const e=String(_?.session?.user?.id||_?.session?.userId||""),t=Array.isArray(window.__BC_MB_STAFF_ROWS__)?window.__BC_MB_STAFF_ROWS__:[];return t.length?t.map(r=>{const a=String(r?.role||"").toLowerCase(),s=String(r?.user_id||"").trim();if(!s||a==="demo"||s===e)return null;const i=String(r?.display_name||"").trim();return{userId:s,label:i||s}}).filter(r=>r?.userId):(Array.isArray(window.__BC_MB_THREADS__)?window.__BC_MB_THREADS__:[]).map(r=>{const a=String(r?.userId||r?.receiver_user_id||r?.sender_user_id||"").trim();if(!a||a===e)return null;const s=r?.title||r?.name||r?.userName||r?.displayName||r?.waiterName||"";return{userId:a,label:String(s).trim()||a}}).filter(r=>r?.userId)}function Dr(e,t={}){if(!e)return;const n=Fo(),r=String(t.placeholder||"Select staff"),a=String(t.selectedUserId||window.__BC_MB_ACTIVE_THREAD_USER_ID__||""),s=[`<option value="">${y(r)}</option>`,...n.map(i=>{const l=a&&String(i.userId)===a?"selected":"";return`<option value="${y(i.userId)}" ${l}>${y(i.label)}</option>`})];e.innerHTML=s.join("")}function Kt(){["mbTimedChallengeTarget","mbLcTimedChallengeTarget","mbLcDisplayMethodTarget","mbLcDrillTarget"].forEach(t=>{const n=document.getElementById(t);n&&Dr(n,{selectedUserId:window.__BC_MB_ACTIVE_THREAD_USER_ID__||""})})}function qo(){return["mbTimedChallengeWine","mbLcTimedChallengeWine"]}function os(e={}){const t=String(e?.name||"Wine").trim(),n=String(e?.region||"").trim(),r=String(e?.varietal||"").trim(),a=[n,r].filter(Boolean).join(" • ");return a?`${t} - ${a}`:t}function jo(e={},t=0){const n=[e?.id,e?.wine_id,e?.wineId,e?._id,e?.created_at,e?.updated_at];for(const a of n){const s=String(a||"").trim();if(s)return s}const r=os(e);return r?`${r}::${t}`:`wine::${t}`}function ee(e,t=[]){const n=String(e||"").trim(),r=Array.isArray(t)?t.slice():[];window.__BC_SHARED_MANAGER_WINES__=r,window.__BC_SHARED_MANAGER_WINES_RID__=n,window.__BC_RESTAURANT_WINES__=r,window.__BC_RESTAURANT_WINES_RID__=n,window.__BC_MANAGER_WINE_OPTIONS__=r,window.__BC_MANAGER_WINE_OPTIONS_RID__=n,window.__BC_TIMED_CHALLENGE_WINE_OPTIONS__=r,window.__BC_TIMED_CHALLENGE_WINE_OPTIONS_RID__=n;try{Or?.(n)}catch(a){console.warn("[WINE] timed challenge cache render failed",a)}return r}function Vo(e=null){const t=String(e||"").trim(),n=[];t&&n.push(`bc_wines_restaurant_${t}`),n.push("bc_wines","BC_WINES","bc_wines_premium");for(const r of n)try{const a=localStorage.getItem(r);if(!a)continue;const s=JSON.parse(a);if(Array.isArray(s)&&s.length)return s}catch{}return[]}function km(){const e=[],t=new Set,n=(r=[])=>{for(const a of Array.isArray(r)?r:[]){const s=Ki(a);!s||t.has(s)||(t.add(s),e.push(a))}};try{for(let r=0;r<localStorage.length;r+=1){const a=String(localStorage.key(r)||"");if(!a||a!=="bc_wines"&&a!=="BC_WINES"&&a!=="bc_wines_premium"&&!a.startsWith("bc_wines_restaurant_"))continue;const s=localStorage.getItem(a);if(!s)continue;const i=JSON.parse(s);n(i)}}catch{}return e}function xn(e=null){const t=String(e||"").trim(),n=Vo(t);if(n.length)return n;const r=km();if(r.length)return r;const a=[{rid:String(window.__BC_SHARED_MANAGER_WINES_RID__||""),rows:Array.isArray(window.__BC_SHARED_MANAGER_WINES__)?window.__BC_SHARED_MANAGER_WINES__:[]},{rid:String(window.__BC_RESTAURANT_WINES_RID__||""),rows:Array.isArray(window.__BC_RESTAURANT_WINES__)?window.__BC_RESTAURANT_WINES__:[]},{rid:String(window.__BC_MANAGER_WINE_OPTIONS_RID__||""),rows:Array.isArray(window.__BC_MANAGER_WINE_OPTIONS__)?window.__BC_MANAGER_WINE_OPTIONS__:[]},{rid:String(window.__BC_TIMED_CHALLENGE_WINE_OPTIONS_RID__||""),rows:Array.isArray(window.__BC_TIMED_CHALLENGE_WINE_OPTIONS__)?window.__BC_TIMED_CHALLENGE_WINE_OPTIONS__:[]}];for(const i of a)if(!(t&&i.rid&&i.rid!==t)&&Array.isArray(i.rows)&&i.rows.length)return i.rows;const s=Array.isArray(_n?.()?.wines)?_n().wines:[];return s.length?s:[]}function Js(){const t=(Array.isArray(window.__BC_ALLOWED_RESTAURANT_IDS__)?window.__BC_ALLOWED_RESTAURANT_IDS__:[]).map(n=>String(n||"").trim()).filter(Boolean);return Array.from(new Set(t))}async function Xs(e=[]){const t=Array.isArray(e)?e.map(a=>String(a||"").trim()).filter(Boolean):[];if(!t.length)return[];const{data:n,error:r}=await I.from("bc_wines").select("*").in("restaurant_id",t).order("created_at",{ascending:!0});if(r)throw r;return cr(n||[])}async function Ut(){const e=Vo();if(e.length)return cr(e);const{data:t,error:n}=await I.from("bc_wines").select("*").order("created_at",{ascending:!0});if(n)throw n;return cr(t||[])}function Ba(e=[],t=[],n=""){const r=Array.isArray(t)?t:[],s=[{id:"",label:r.length?"Select wine":"No wines available"},...r.map((i,l)=>({id:jo(i,l),label:os(i)})).filter(i=>i.id)];return e.forEach(i=>{const l=String(i.value||"").trim();i.innerHTML=s.map(c=>{const o=l?String(c.id)===l:n&&String(c.id)===n;return`<option value="${y(c.id)}"${o?" selected":""}>${y(c.label)}</option>`}).join(""),!i.value&&n&&(i.value=n)}),r}function Zs(e=[],t=""){const n=Array.isArray(e)?e:[];return[{id:"",label:n.length?"Select wine":"No wines available"},...n.map((s,i)=>({id:jo(s,i),label:os(s)})).filter(s=>s.id)].map(s=>{const i=t&&String(s.id)===String(t);return`<option value="${y(s.id)}"${i?" selected":""}>${y(s.label)}</option>`}).join("")}function Or(e=null){const n=qo().map(c=>document.getElementById(c)).filter(Boolean);if(!n.length)return[];const r=String(e||j()||window.__BC_MB_ACTIVE_THREAD_RESTAURANT_ID__||_?.restaurant?.id||_?.activeRestaurantId||_?.profile?.restaurant_id||"").trim(),a=$e(r),s=a.length?a:xn(),i=window.getActiveWineForPremium?.()||null,l=String(i?.id||"").trim();return Ba(n,s,l)}async function ls(e=null,{force:t=!1}={}){const n=String(e||j()||window.__BC_MB_ACTIVE_THREAD_RESTAURANT_ID__||_?.restaurant?.id||_?.activeRestaurantId||_?.profile?.restaurant_id||"").trim();if(!n){try{const i=await Ut();if(i.length)return ee("",i)}catch(i){console.warn("[TIMED CHALLENGE] global wine fallback for missing restaurant failed",i)}return ee("",[]),[]}const r=xn(n),a=String(window.__BC_MANAGER_WINE_OPTIONS_RID__||window.__BC_TIMED_CHALLENGE_WINE_OPTIONS_RID__||window.__BC_RESTAURANT_WINES_RID__||"");if(!t&&a===n&&r.length)return ee(n,r);const s=_n?.();if(s){const i=Array.isArray(s.wines)?s.wines:[];if(i.length&&(!a||a===n))return ee(n,i);try{if(s.WineBridge?.fetchRestaurantWines){const l=ue("premium")?.scopeId||_?.profile?.scope_id||null,c=await s.WineBridge.fetchRestaurantWines(l,n),o=Array.isArray(c)?c:[];if(o.length)return ee(n,o)}}catch(l){console.warn("[TIMED CHALLENGE] premium-frame wine bridge failed",l)}}try{const i=await ar(n),l=Array.isArray(i)?i.slice():[];if(l.length)return ee(n,l);const c=Js().filter(o=>o!==n);if(c.length)try{const o=await Xs(c);if(o.length)return ee(n||c[0]||"",o)}catch(o){console.warn("[TIMED CHALLENGE] scope wine fallback failed",o)}if(r.length)return ee(n,r);try{const o=await Ut();if(o.length)return ee(n,o)}catch(o){console.warn("[TIMED CHALLENGE] global wine fallback failed",o)}return ee(n,[])}catch(i){console.warn("[TIMED CHALLENGE] wine refresh failed",i);const l=Js().filter(c=>c!==n);if(l.length)try{const c=await Xs(l);if(c.length)return ee(n||l[0]||"",c)}catch(c){console.warn("[TIMED CHALLENGE] scope wine fallback after error failed",c)}if(r.length)return ee(n,r);try{const c=await Ut();if(c.length)return ee(n,c)}catch(c){console.warn("[TIMED CHALLENGE] global wine fallback after error failed",c)}return ee(n,[])}}async function Nm(e=null,{force:t=!1}={}){return ls(e,{force:t})}async function Et(){const e=String(j()||window.__BC_MB_ACTIVE_THREAD_RESTAURANT_ID__||_?.restaurant?.id||_?.activeRestaurantId||_?.profile?.restaurant_id||"").trim(),t=qo(),n=()=>t.map(d=>document.getElementById(d)).filter(Boolean),r=n();if(!r.length)return[];if(!e){const d=$e();return d.length?Ba(r,d,String(window.getActiveWineForPremium?.()?.id||"").trim()):(r.forEach(p=>{p.options.length<=1&&(p.innerHTML='<option value="">No wines available</option>'),p.value=p.value||""}),[])}const a=$e(e);Array.isArray(a)&&a.length&&Or(e);let s=[];try{s=await ls(e,{force:!1})}catch(d){console.warn("[TIMED CHALLENGE] wine options load failed",d),s=[]}const i=s.length?s:$e(e),l=window.getActiveWineForPremium?.()||null,c=String(l?.id||""),o=n();return o.length?Ba(o,i,c):s}const Ma=Object.freeze({messenger:Object.freeze({target:"mbTimedChallengeTarget",type:"mbTimedChallengeType",duration:"mbTimedChallengeDuration",reward:"mbTimedChallengeReward",placement:"mbTimedChallengePlacement",status:"mbTimedChallengeStatus",send:"btnSendTimedChallenge",meta:null,recent:"mbTimedChallengeRecentSummary"}),live_controls:Object.freeze({target:"mbLcTimedChallengeTarget",type:"mbLcTimedChallengeType",duration:"mbLcTimedChallengeDuration",reward:"mbLcTimedChallengeReward",placement:"mbLcTimedChallengePlacement",status:"mbLcTimedChallengeStatus",send:"mbLcTimedChallengeSend",meta:"mbLcTimedChallengeMeta",recent:"mbLcTimedChallengeRecentSummary"})});function cs(e="messenger"){return Ma[e]||Ma.messenger}function Pm(e="messenger"){const t=cs(e),n=document.getElementById(t.target),r=document.getElementById(t.type),a=document.getElementById(e==="live_controls"?"mbLcTimedChallengeWine":"mbTimedChallengeWine"),s=document.getElementById(t.duration),i=document.getElementById(t.reward);return{targetUserId:String(n?.value||"").trim()||null,challengeKey:String(r?.value||"closing_push"),activeWineId:String(a?.value||"").trim()||null,durationSec:Math.max(60,Math.min(10800,Number(s?.value||10800))),rewardPoints:Math.max(1,Math.min(5,Number(i?.value||5))),placement:String(document.getElementById(t.placement)?.value||"before_start")}}function Dm(e={}){const t=e.targetUserId||null,n=e.challengeKey||"closing_push",r=Math.max(60,Math.min(10800,Number(e.durationSec||10800))),a=Number(e.rewardPoints||50),s=String(e.placement||"before_start"),i=String(e.activeWineId||"").trim()||null,l=j();if(!t||!l)return null;const c={closing_push:{title:"Closing Push",focus:"closing",successRule:{type:"strongest_skill_equals",value:"closing"}},recovery_window:{title:"Recovery Window",focus:"recovery",successRule:{type:"strongest_skill_equals",value:"recovery"}},clean_close:{title:"Clean Close",focus:"closing",successRule:{type:"outcome_equals",value:"clean_close"}},soft_close:{title:"Soft Close",focus:"closing",successRule:{type:"outcome_equals",value:"soft_close"}},successful_pivot:{title:"Successful Pivot",focus:"recovery",successRule:{type:"outcome_equals",value:"pivot"}},read_first:{title:"Read First",focus:"read",successRule:{type:"guest_read_correct",value:!0}},full_delivery:{title:"Full Delivery",focus:"delivery",successRule:{type:"delivery_score_gte",value:2}},no_reset_run:{title:"No Reset Run",focus:"delivery",successRule:{type:"no_reset_used",value:!0}},stable_signal:{title:"Stable Signal",focus:"recovery",successRule:{type:"reaction_signal_equals",value:"green"}},controlled_table:{title:"Controlled Table",focus:"delivery",successRule:{type:"strong_pillars_gte",value:3}},solid_interaction:{title:"Solid Interaction",focus:"recovery",successRule:{type:"chain_score_gte",value:6}},premium_moment:{title:"Premium Moment",focus:"closing",successRule:{type:"premium_roll_success",value:!0}},commanding_presence:{title:"Commanding Presence",focus:"delivery",successRule:{type:"strong_pillars_gte",value:4}}},o=c[n]||c.closing_push;return{challengeKey:n,title:o.title,targetUserId:t,restaurantId:l,durationSec:r,assignmentWindowSec:r,encounterTimerSec:300,injectionMode:"extra_encounter",placement:s,focus:o.focus,rewardPoints:a,successRule:o.successRule,activeWineId:i,activeWine:null}}function $r(e=0){const t=Math.max(0,Number(e||0));if(!t)return"0 min";const n=Math.floor(t/3600),r=Math.floor(t%3600/60);return n&&r?`${n}h ${r}m`:n?`${n}h`:`${Math.round(t/60)} min`}function ei(e={}){const t=String(e.placement||"before_start")==="after_first_encounter"?"After encounter 1":"Before encounter 1";return`Challenge Sent • ${e.challengeKey?Xe(e.challengeKey):"Timed Challenge"} • ${$r(e.durationSec)} • ${t} • Reward ${Number(e.rewardPoints||0)}`}function ne(e,t="idle",n=""){const r=typeof e=="string"?document.getElementById(e):e;if(!r)return;r.textContent=String(n||""),r.dataset.state=String(t||"idle");const a=t==="error"||t==="success"?"0.95":t==="working"?"0.9":"0.85";r.style.opacity=a}async function Om(e={}){const t=Dm(e),n=_?.profile||{},r=J(n),a=document.getElementById("mbTimedChallengeStatus"),s=document.getElementById("mbLcTimedChallengeStatus"),i=m=>{a&&(a.textContent=m),s&&(s.textContent=m)};if(!r.canAssignTimedChallenges)return i("Role cannot assign timed challenges."),!1;if(!t)return i("Missing target or restaurant."),!1;if(!Me(n,n,t.restaurantId))return i("Role cannot act on this restaurant."),!1;const l=String(t?.challengeKey||""),c=Number(Hn?.[l]||0),o=Number(wm?.[l]||0);try{await Nm(t.restaurantId,{force:!1})}catch{}const d=String(t?.activeWineId||"").trim(),p=d&&Array.isArray(window.__BC_TIMED_CHALLENGE_WINE_OPTIONS__)&&window.__BC_TIMED_CHALLENGE_WINE_OPTIONS__.find(m=>String(m?.id||"")===d)||null;if(p&&(t.activeWine=p),rs(l)){const m=Bt(l);return i(`Challenge on cooldown (${m}s)`),!1}if(!as(c))return i("Not enough influence."),!1;try{const g=(await he())?.userId||null;if(!g)return i("No active session."),!1;const u=F(n)||"single_manager",h={scope_type:"restaurant",scope_id:n?.scope_id||n?.scopeId||t.restaurantId,restaurant_id:t.restaurantId,sender_user_id:g,receiver_user_id:t.targetUserId,sender_role:u,type:"timed_challenge",body:`${t.title} • ${$r(t.durationSec)}`,payload:t},{error:w}=await I.from("bc_messages_v1").insert(h);if(w)throw w;return Lo(c),ko(l,o),ce?.({thread:!0,board:!0,economy:!0,liveControls:!1,challengeMeta:!0}),i(`${t.title} sent ✅`),Dn(),Pn(t.restaurantId),await Be(t.restaurantId,{force:!0}),ce?.({thread:!0,board:!0,economy:!0,liveControls:!1,challengeMeta:!0}),!0}catch(m){return console.warn("[TIMED CHALLENGE] send failed",m),i("Could not send challenge."),!1}}function Ko(){Dt("messenger")}function Dt(e="messenger"){const t=cs(e),n=document.getElementById(t.type),r=document.getElementById(t.status),a=document.getElementById(t.send),s=t.meta?document.getElementById(t.meta):null;if(!n)return;const i=String(n.value||""),l=Number(Hn?.[i]||0),c=vt({key:i,cost:l,type:"challenge"}),o=c?`${An(l)} • ${c}`:`${An(l)} • Ready`;a&&(a.disabled=!!c,a.style.opacity=c?".6":"1",a.style.cursor=c?"not-allowed":"",a.title=c||"Send challenge"),r&&(!r.dataset.state||r.dataset.state==="idle")&&(r.textContent=o),s&&(s.textContent=o)}function Yo(){zo("messenger")}function $m(){zo("live_controls")}function ds(){Dt("live_controls")}function zo(e="messenger"){const t=cs(e),n=document.getElementById(t.send),r=[t.type,t.target,t.duration,t.reward,t.placement].filter(Boolean),a=e==="live_controls"?"mbLcTimedChallengeWine":"mbTimedChallengeWine";if(r.push(a),r.forEach(s=>{const i=document.getElementById(s);!i||i.__bcTimedChallengeMetaBound||(i.__bcTimedChallengeMetaBound=!0,i.addEventListener("change",()=>{Dt(e)}))}),!n||n.__bcTimedChallengeBound){Dt(e);return}n.__bcTimedChallengeBound=!0,n.addEventListener("click",async()=>{const s=document.getElementById(t.status);e==="live_controls"?ne(s,"working","Sending challenge…"):s&&(s.textContent="Sending challenge…");try{const i=Pm(e);if(await Om(i)){e==="live_controls"?ne(s,"success",ei(i)):s&&(s.textContent=ei(i));const c=document.getElementById(Ma.messenger.recent),o=document.getElementById(t.recent);c&&o&&c!==o&&(o.textContent=c.textContent||"")}else e==="live_controls"&&s&&!s.textContent?ne(s,"error","Could not send challenge."):s&&!s.textContent&&(s.textContent="Could not send challenge.")}catch(i){e==="live_controls"?ne(s,"error",i?.message||String(i)):s&&(s.textContent=i?.message||String(i))}Dt(e)}),Dt(e)}function br(){return!!J(_?.profile).canAssignTimedChallenges}function Rt(){const e=document.getElementById("mbTimedChallengeComposer");e&&e.classList.toggle("hidden",!br()),br()&&(Kt(),Et().catch(console.warn),Yo(),Dn())}function Qo(){const e=document.getElementById("mbTimedChallengeQuickActionsPanel");if(!e)return;const t=br(),r=[["closing_push","Closing Push"],["recovery_window","Recovery Window"],["clean_close","Clean Close"],["read_first","Read First"],["full_delivery","Full Delivery"],["no_reset_run","No Reset Run"]].map(([g,u])=>{const f=Bn(g,Hn?.[g]||0);return`<option value="${y(g)}">${y(u)} (${y(f)})</option>`}).join(""),a=j()||_?.restaurant?.id||_?.activeRestaurantId||_?.profile?.restaurant_id||"",s=window.getActiveWineForPremium?.()||null,i=Zs($e(a),s?.id||"");e.innerHTML=`
    <div class="card" style="display:flex; flex-direction:column; gap:10px; padding:12px;">
      <div style="font-weight:600;">Timed Challenge</div>
      <div class="small-text" style="opacity:.8;">
        Send a live objective to a staff member in the active restaurant.
      </div>

      <div class="row" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <select id="mbLcTimedChallengeTarget" style="min-width:180px;"></select>

        <select id="mbLcTimedChallengeType">
          ${r}
        </select>

        <select id="mbLcTimedChallengeWine" style="min-width:220px;">
          ${i}
        </select>

        <select id="mbLcTimedChallengeDuration">
          <option value="3600">1 hr</option>
          <option value="7200">2 hrs</option>
          <option value="10800" selected>3 hrs</option>
        </select>
        <select id="mbLcTimedChallengePlacement">
          <option value="before_start" selected>Before encounter 1</option>
          <option value="after_first_encounter">After encounter 1</option>
        </select>
        <input
          id="mbLcTimedChallengeReward"
          type="number"
          min="1"
          max="5"
          step="1"
          value="5"
          style="width:110px;"
          placeholder="Points"
        />
      </div>

      <div class="small-text" id="mbLcTimedChallengeMeta" style="opacity:.78;">
        Select a challenge to view cost and cooldown state.
      </div>
      <div class="row" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <button id="mbLcTimedChallengeSend" class="btn" type="button" ${t?"":"disabled"}>Send Challenge</button>
        <div id="mbLcTimedChallengeStatus" class="small-text" style="opacity:.85;"></div>
      </div>
      <div id="mbLcTimedChallengeRecentSummary" class="small-text" style="opacity:.8;"></div>
    </div>
  `,e.dataset.restaurantId=String(a||"");const l="mbLcTimedChallengeWineStatus";if(!document.getElementById(l)){const g=document.createElement("div");g.id=l,g.className="small-text",g.style.opacity=".72",g.style.marginTop="4px",g.textContent="Wines loaded: 0",e.appendChild(g)}const o=document.getElementById(l),d=Array.isArray(window.__BC_TIMED_CHALLENGE_WINE_OPTIONS__)?window.__BC_TIMED_CHALLENGE_WINE_OPTIONS__.length:0;if(o&&(o.textContent=`Wines loaded: ${d}`),!t){const g=document.createElement("div");g.className="small-text",g.style.opacity=".8",g.style.marginTop="6px",g.textContent="Your role cannot send timed challenges in this restaurant context.",e.appendChild(g)}Dr(document.getElementById("mbLcTimedChallengeTarget"),{selectedUserId:window.__BC_MB_ACTIVE_THREAD_USER_ID__||""}),Kt();try{const g=document.getElementById("mbLcTimedChallengeWine");if(g){const u=String(s?.id||"").trim(),f=$e(a),h=f.length?f:$e();g.innerHTML=Zs(h,u)}Or?.(a)}catch(g){console.warn("[TIMED CHALLENGE] cache render failed",g)}(async()=>{try{await Et()}catch(h){console.warn("[TIMED CHALLENGE] wine refresh failed in action panel",h)}const g=Array.isArray(window.__BC_TIMED_CHALLENGE_WINE_OPTIONS__)?window.__BC_TIMED_CHALLENGE_WINE_OPTIONS__.length:0,u=document.getElementById("mbLcTimedChallengeWine"),f=document.getElementById(l);f&&(f.textContent=`Wines loaded: ${g}`+(u&&u.options&&u.options.length>1?"":" (no selectable wines)"))})(),$m?.(),ds?.();const p=document.getElementById("mbTimedChallengeRecentSummary"),m=document.getElementById("mbLcTimedChallengeRecentSummary");p&&m&&(m.textContent=p.textContent||"")}function Um(){const e=document.getElementById("mbLcDisplayMethodTarget"),t=document.getElementById("mbLcDisplayMethodType"),n=document.getElementById("mbLcDisplayMethodDuration"),r=document.getElementById("mbLcDisplayMethodReward"),a=document.getElementById("mbLcDisplayMethodStrictness"),s=document.getElementById("mbLcDisplayMethodPlacement");return{targetUserId:String(e?.value||"").trim()||null,methodKey:String(t?.value||"comparison"),challengeKey:String(t?.value||"comparison"),durationSec:Math.max(60,Math.min(10800,Number(n?.value||10800))),rewardPoints:Math.max(1,Math.min(5,Number(r?.value||5))),strictness:String(a?.value||"normal"),placement:String(s?.value||"before_start")}}function Hm(e={}){const t=e.targetUserId||null,n=e.methodKey||e.challengeKey||"comparison",r=n,a=Math.max(60,Math.min(10800,Number(e.durationSec||10800))),s=Number(e.rewardPoints||5),i=String(e.strictness||"normal"),l=String(e.placement||"before_start"),c=j();if(!t||!c)return null;const o={comparison:{title:"Display Method: Comparison",focus:"comparison",successRule:{type:"display_method_match",value:"comparison"}},pairing:{title:"Display Method: Pairing",focus:"pairing",successRule:{type:"display_method_match",value:"pairing"}},value_justification:{title:"Display Method: Value Justification",focus:"value_justification",successRule:{type:"display_method_match",value:"value_justification"}}},d=o[n]||o.comparison;return{challengeKey:r,methodKey:n,title:d.title,targetUserId:t,restaurantId:c,durationSec:a,assignmentWindowSec:a,encounterTimerSec:300,injectionMode:"extra_encounter",placement:l,focus:d.focus,rewardPoints:s,strictness:i,successRule:d.successRule}}function Gm(e={}){const t=String(e.placement||"before_start")==="after_first_encounter"?"After encounter 1":"Before encounter 1";return`Challenge Sent • ${yt(e.methodKey||e.challengeKey)} • ${$r(e.durationSec)} • ${t} • Reward ${Number(e.rewardPoints||0)}`}async function Wm(e={}){const t=Hm(e),n=_?.profile||{},r=J(n),a=document.getElementById("mbLcDisplayMethodStatus");if(!r.canAssignTimedChallenges)return ne(a,"error","Role cannot assign display method challenges."),!1;if(!t)return ne(a,"error","Missing target or restaurant."),!1;if(!Me(n,n,t.restaurantId))return ne(a,"error","Role cannot act on this restaurant."),!1;try{const i=(await he())?.userId||null;if(!i)return ne(a,"error","No active session."),!1;const l=F(n)||"single_manager",o={scope_type:"restaurant",scope_id:n?.scope_id||n?.scopeId||t.restaurantId,restaurant_id:t.restaurantId,sender_user_id:i,receiver_user_id:t.targetUserId,sender_role:l,type:"display_method_challenge",body:`${t.title} • ${$r(t.durationSec)}`,payload:t},{error:d}=await I.from("bc_messages_v1").insert(o);if(d)throw d;return ce?.({thread:!0,board:!0,economy:!1,liveControls:!1,challengeMeta:!0}),ne(a,"success",`${t.title} sent ✅`),Tr?.(),Pn(t.restaurantId),await Be(t.restaurantId,{force:!0}),ce?.({thread:!0,board:!0,economy:!1,liveControls:!1,challengeMeta:!0}),!0}catch(s){return console.warn("[DISPLAY METHOD CHALLENGE] send failed",s),ne(a,"error","Could not send challenge."),!1}}function Ot(){const e=document.getElementById("mbLcDisplayMethodType"),t=document.getElementById("mbLcDisplayMethodMeta");if(!e||!t)return;const n=String(e.value||"comparison"),r=String(document.getElementById("mbLcDisplayMethodStrictness")?.value||"normal"),a={comparison:"Require a clear compare-and-guide recommendation, not a flat product drop.",pairing:"Reward food-context pairing logic and a recommendation that feels matched to the table.",value_justification:"Reward a recommendation that explains why the choice is worth it for this guest."};t.textContent=`${a[n]||a.comparison} Strictness: ${r}.`}function Fm(){const e=document.getElementById("mbLcDisplayMethodSend");if(["mbLcDisplayMethodTarget","mbLcDisplayMethodType","mbLcDisplayMethodDuration","mbLcDisplayMethodPlacement","mbLcDisplayMethodReward","mbLcDisplayMethodStrictness"].forEach(n=>{const r=document.getElementById(n);!r||r.__bcDisplayMethodMetaBound||(r.__bcDisplayMethodMetaBound=!0,r.addEventListener("change",()=>Ot()))}),!e||e.__bcDisplayMethodBound){Ot();return}e.__bcDisplayMethodBound=!0,e.addEventListener("click",async()=>{const n=document.getElementById("mbLcDisplayMethodStatus");ne(n,"working","Sending challenge…");try{const r=Um();await Wm(r)?ne(n,"success",Gm(r)):n&&!n.textContent&&ne(n,"error","Could not send challenge.")}catch(r){ne(n,"error",r?.message||String(r))}Ot()}),Ot()}function Jo(){const e=document.getElementById("mbDisplayMethodQuickActionsPanel");if(!e)return;if(!br()){e.innerHTML=`
      <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
        <div style="font-weight:600;">Display Method Challenge</div>
        <div class="small-text" style="opacity:.8;">
          Your role cannot send display method challenges in this restaurant context.
        </div>
      </div>
    `;return}const t=[["comparison","Comparison"],["pairing","Pairing"],["value_justification","Value Justification"]].map(([n,r])=>`<option value="${y(n)}">${y(r)}</option>`).join("");e.innerHTML=`
    <div class="card" style="display:flex; flex-direction:column; gap:10px; padding:12px;">
      <div style="font-weight:600;">Display Method Challenge</div>
      <div class="small-text" style="opacity:.8;">
        Send a live display-method challenge to a staff member in the active restaurant.
      </div>

      <div class="row" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <select id="mbLcDisplayMethodTarget" style="min-width:180px;"></select>
        <select id="mbLcDisplayMethodType">${t}</select>
        <select id="mbLcDisplayMethodDuration">
          <option value="3600">1 hr</option>
          <option value="7200">2 hrs</option>
          <option value="10800" selected>3 hrs</option>
        </select>
        <select id="mbLcDisplayMethodPlacement">
          <option value="before_start" selected>Before encounter 1</option>
          <option value="after_first_encounter">After encounter 1</option>
        </select>
        <input
          id="mbLcDisplayMethodReward"
          type="number"
          min="1"
          max="5"
          step="1"
          value="5"
          style="width:110px;"
          placeholder="Points"
        />
        <select id="mbLcDisplayMethodStrictness">
          <option value="normal" selected>Normal</option>
          <option value="hard">Hard</option>
          <option value="strict">Strict</option>
        </select>
      </div>

      <div class="small-text" id="mbLcDisplayMethodMeta" style="opacity:.78;">
        Select a method to view challenge guidance.
      </div>

      <div class="row" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <button id="mbLcDisplayMethodSend" class="btn" type="button">Send Challenge</button>
        <div id="mbLcDisplayMethodStatus" class="small-text" style="opacity:.85;"></div>
      </div>
      <div id="mbLcDisplayMethodRecentSummary" class="small-text" style="opacity:.8;"></div>
    </div>
  `,Dr(document.getElementById("mbLcDisplayMethodTarget"),{selectedUserId:window.__BC_MB_ACTIVE_THREAD_USER_ID__||""}),Kt(),Fm?.(),Ot?.(),Tr?.()}async function qm(){const{restaurantId:e,isManager:t}=We();if(!t)throw new Error("Manager only");if(!e)throw new Error("Active restaurant not set");if(!Io())throw new Error("Scope not set");const r=String(window.__BC_MB_ACTIVE_THREAD_USER_ID__||""),a=String(U("mbInstrBody")?.value||"").trim(),s=U("mbInstrStatus");if(!r)throw new Error("Select a waiter thread");if(!a)throw new Error("Write a short instruction");s&&(s.textContent="Sending…");const i=_?.session?.user?.id||_?.session?.userId||null,l=String(_?.profile?.role||"");if(!i)throw new Error("No session");if((await Co({senderUserId:i})).remaining<=0)throw await fr(),new Error("Daily free message limit reached");const o={scope_type:"restaurant",scope_id:e,restaurant_id:e,sender_user_id:i,receiver_user_id:r,sender_role:l,type:"instruction",body:a,payload:null},{error:d}=await I.from("bc_messages_v1").insert(o);if(d)throw d;s&&(s.textContent="Sent ✅");try{U("mbInstrBody").value=""}catch{}await fr(),Pn(e),await Be(e,{force:!0}),ce?.({thread:!0,board:!0,economy:!1,liveControls:!1,challengeMeta:!0})}function jm(e="live_controls"){const t=e==="live_controls"?{target:"mbLcDrillTarget",focus:"mbLcDrillFocus",reps:"mbLcDrillReps",duration:"mbLcDrillDuration",tier:"mbLcDrillTier"}:{target:"mbTimedChallengeTarget",focus:null,reps:null,duration:null,tier:null};return{targetUserId:String(document.getElementById(t.target)?.value||"").trim()||null,focus:String(document.getElementById(t.focus)?.value||"").trim()||"read",repTarget:Number(document.getElementById(t.reps)?.value||3),durationSec:Number(document.getElementById(t.duration)?.value||300),tier:Number(document.getElementById(t.tier)?.value||1)}}function Vm(e){const r=[...(Array.isArray(window.__BC_MB_THREADS__)?window.__BC_MB_THREADS__:[]).find(s=>String(s?.userId||"")===String(e||""))?.rows||[]].sort((s,i)=>new Date(s.created_at)-new Date(i.created_at)).slice(-1)[0]||null,a=fe(r)||{};return{latest:r,payload:a,guest:String(a?.guestStateActual||"").toLowerCase(),signal:String(a?.chainSignal||a?.outcome||"").toLowerCase()}}function Xo(e){const t=document.getElementById("mbLcDrillHint");if(!t)return;if(!e){t.textContent="Pick a waiter to see a suggested drill direction.";return}const{guest:n,signal:r}=Vm(e);let a="Suggested: Read drill as a safe default.";r==="red"||r==="soft_close"?a="Suggested: Read drill based on the latest weak result.":n==="griever"?a="Suggested: Recovery drill due to softer, resistant guest energy.":n==="decider"||n==="dictator"?a="Suggested: Closing or read drill for decisive-table handling.":n==="fancy"&&(a="Suggested: Frame or delivery drill for precision and confidence."),t.textContent=a}async function us(e={}){const{restaurantId:t,canAct:n,caps:r}=We();if(!t)throw new Error("Active restaurant not set");if(!r.canAssignDrills)throw new Error("Role cannot assign drills.");if(!n)throw new Error("Role cannot act on this restaurant.");const a=String(e.targetUserId||window.__BC_MB_ACTIVE_THREAD_USER_ID__||""),s=U("mbInstrStatus");if(!a)throw new Error("Select a waiter thread");s&&!e.silentStatus&&(s.textContent="Sending drill…");const i=_?.session?.user?.id||_?.session?.userId||null,l=F(_?.profile)||"single_manager",c=_?.profile?.scope_id||_?.profile?.scopeId||t;if(!i)throw new Error("No session");const o=window.__BC_DRILL_CONFIG__||window.BC_DRILL_CONFIG||null,m=[...(Array.isArray(window.__BC_MB_THREADS__)?window.__BC_MB_THREADS__:[]).find(v=>String(v?.userId||"")===String(a))?.rows||[]].sort((v,R)=>new Date(v.created_at)-new Date(R.created_at)).slice(-1)[0],g=fe(m)||{},u=String(g?.guestStateActual||"").toLowerCase(),f=String(g?.chainSignal||"").toLowerCase();let h=String(e.focus||"").toLowerCase()||"read",w=["dictator","bargain_smart","griever"],S=1,E=300,b=3;h==="read"?u==="decider"||u==="dictator"?w=["dictator"]:w=["dictator","bargain_smart","griever"]:h==="frame"?w=["dictator","fancy"]:h==="delivery"?w=["dictator","fancy","griever"]:h==="recovery"?(w=["griever","dictator"],b=4):h==="closing"&&(w=["dictator","fancy"]),!e.focus&&(f==="soft_close"||f==="red")&&(h="read",b=4),Array.isArray(e.pool)&&e.pool.length&&(w=e.pool),e.tier!=null&&(S=Number(e.tier)),e.durationSec!=null&&(E=Number(e.durationSec)),e.repTarget!=null&&(b=Number(e.repTarget));const B={...o||{},focus:h,pool:w,repTarget:b,durationSec:E,tier:S},L={scope_type:"restaurant",scope_id:c,restaurant_id:t,sender_user_id:i,receiver_user_id:a,sender_role:l,type:"drill_override",body:`Assigned a ${h} drill to this waiter.`,payload:{drill:B,reason:"Manager assigned a focused drill based on recent progress."}},{error:k}=await I.from("bc_messages_v1").insert(L);if(k)throw k;return s&&!e.silentStatus&&(s.textContent="Drill sent ✅"),Pn(t),await Be(t,{force:!0}),ce?.({thread:!0,board:!0,economy:!1,liveControls:!1,challengeMeta:!0}),!0}function Km(){const e=document.getElementById("mbDrillQuickActionsPanel");if(!e)return;const n=!!J(_?.profile).canAssignDrills;if(e.innerHTML=`
    <div class="card" style="display:flex; flex-direction:column; gap:10px; padding:12px;">
      <div style="font-weight:600;">Assign Drill</div>
      <div class="small-text" style="opacity:.8;">
        Send a focused practice block to a waiter.
      </div>
      <div class="row" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <select id="mbLcDrillTarget" style="min-width:180px;"></select>
        <select id="mbLcDrillFocus">
          <option value="read">Read</option>
          <option value="frame">Frame</option>
          <option value="delivery">Delivery</option>
          <option value="recovery">Recovery</option>
          <option value="closing">Closing</option>
        </select>
        <input id="mbLcDrillReps" type="number" min="1" step="1" value="3" style="width:90px;" placeholder="Reps" />
        <select id="mbLcDrillDuration">
          <option value="180">3 min</option>
          <option value="300" selected>5 min</option>
          <option value="600">10 min</option>
        </select>
        <select id="mbLcDrillTier">
          <option value="1">Tier 1</option>
          <option value="2">Tier 2</option>
          <option value="3">Tier 3</option>
        </select>
      </div>
      <div class="row" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <button id="mbLcDrillSend" class="btn" type="button" ${n?"":"disabled"}>Assign Drill</button>
        <div id="mbLcDrillStatus" class="small-text" style="opacity:.85;"></div>
      </div>
      <div id="mbLcDrillHint" class="small-text" style="opacity:.8;"></div>
    </div>
  `,Dr(document.getElementById("mbLcDrillTarget"),{selectedUserId:window.__BC_MB_ACTIVE_THREAD_USER_ID__||""}),Xo(window.__BC_MB_ACTIVE_THREAD_USER_ID__||""),!n){const r=document.getElementById("mbLcDrillHint");r&&(r.textContent="Your role cannot assign drills in this restaurant context.")}Kt(),zm?.()}async function Ym(e={}){return e?.targetUserId?us({targetUserId:e.targetUserId,focus:e.focus,repTarget:e.repTarget,durationSec:e.durationSec,tier:e.tier,silentStatus:!0}):!1}function zm(){const e=document.getElementById("mbLcDrillSend"),t=document.getElementById("mbLcDrillTarget");t&&!t.__bcBound&&(t.__bcBound=!0,t.addEventListener("change",()=>{Xo(t.value||"")})),!(!e||e.__bcBound)&&(e.__bcBound=!0,e.addEventListener("click",async()=>{const n=document.getElementById("mbLcDrillStatus");ne(n,"working","Sending drill…");try{const r=jm("live_controls");await Ym(r)?ne(n,"success","Drill sent ✅"):n.textContent||ne(n,"error","Could not send drill.")}catch(r){ne(n,"error",r?.message||String(r))}}))}function vr(){ui();const e=o=>{window.__BC_MB_MESSENGER_OPEN__=!!o;const d=U("mbMessengerDeck"),p=U("mbToggleMessengerPanel");d&&d.classList.toggle("hidden",!o),p&&(p.textContent=o?"Close Inbox":"Open Inbox")},t=document.documentElement.dataset.bcMobileEnv==="true";t&&(window.__BC_MB_MESSENGER_OPEN__=!0),e(t?!0:window.__BC_MB_MESSENGER_OPEN__!==!1);const n=U("mbToggleMessengerPanel");n&&!n.__wired&&(n.__wired=!0,n.addEventListener("click",()=>{if(document.documentElement.dataset.bcMobileEnv==="true"){e(!0);return}e(window.__BC_MB_MESSENGER_OPEN__===!1)})),Xa();const r=U("mbMsgRefresh");r&&!r.__wired&&(r.__wired=!0,r.addEventListener("click",()=>Be(null,{force:!0}).catch(console.error)));const a=U("mbInstrSend");a&&!a.__wired&&(a.__wired=!0,a.addEventListener("click",()=>{qm().catch(o=>{const d=U("mbInstrStatus");d&&(d.textContent=o?.message||String(o))})}));const s=U("mbInstrRunDrill");s&&!s.__wired&&(s.__wired=!0,s.textContent="Assign Drill to This Waiter",s.addEventListener("click",()=>{us().catch(o=>{const d=U("mbInstrStatus");ne(d,"error",o?.message||String(o))})}));const i=U("mbInstrUseSuggestion");i&&!i.__wired&&(i.__wired=!0,i.addEventListener("click",()=>{const o=window.__BC_MB_SELECTED_SUGGESTION__||"",d=U("mbInstrBody");d&&o&&(d.value=o)}));const l=U("mbSuggestedPrompts");l&&!l.__wired&&(l.__wired=!0,l.addEventListener("click",o=>{const d=o.target?.closest?.("[data-suggested-prompt]");if(!d)return;const p=d.getAttribute("data-suggested-prompt")||"";window.__BC_MB_SELECTED_SUGGESTION__=p;const m=U("mbInstrBody");m&&(m.value=p)}));const c=U("mbThreadList");c&&!c.__wired&&(c.__wired=!0,c.addEventListener("click",async o=>{const d=o.target?.closest?.("[data-thread-user-id]");if(!d)return;const p=window.__BC_MB_THREADS__||[],m=d.getAttribute("data-thread-user-id")||"",g=p.find(w=>String(w?.userId||"")===String(m));nt({userId:m,rows:g?.rows||[]});const u=p.map(w=>w.userId),f=await se(u);En(window.__BC_MB_THREADS_ALL__||p,f),O("renderManagerActiveThread",()=>St(f)),O("renderManagerThreadDrillSummary",()=>In?.());const h=document.getElementById("mbTimedChallengeTarget");h&&(h.value=String(window.__BC_MB_ACTIVE_THREAD_USER_ID__||"")),Rt()}))}function ti(e,t,n){const r=document.getElementById("mbMembersList"),a=document.getElementById("mbMembersMsg"),s=document.getElementById("mbPeopleSearch");if(!r||!a)return;Xa(),s&&s.value!==String(window.__BC_MB_PEOPLE_SEARCH__||"")&&(s.value=String(window.__BC_MB_PEOPLE_SEARCH__||""));const i=Du(t,Vs());window.__BC_MB_STAFF_ROWS__=t,window.__BC_MB_WAITERS__=t.filter(o=>String(o?.role||"").toLowerCase()==="waiter");const l=["single_manager","group_manager","enterpriser"].includes(F(n.profile||null)),c=i.map(o=>{const d=String(o?.display_name||"").trim()||"(no name)",p=rt(o?.role),m=F(o)==="waiter",g=l&&m?`
          <button
            type="button"
            class="btn-ghost mb-reset-waiter-progression"
            data-user-id="${y(String(o?.user_id||""))}"
            data-restaurant-id="${y(String(e||""))}"
            data-display-name="${y(d)}"
          >
            Reset progression
          </button>
        `:"";return`
      <div class="card" style="padding:10px; border-radius:12px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div style="min-width:0;">
            <div style="font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${y(d)}
            </div>
            <div class="small-text" style="margin-top:2px;">${y(o?.user_id||"")}</div>
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
            <div class="small-text" style="white-space:nowrap; opacity:0.9;">${y(p)}</div>
            ${g}
          </div>
        </div>
      </div>
    `});r.innerHTML=c.join("")||'<div class="small-text">No members found.</div>',r.querySelectorAll(".mb-reset-waiter-progression").forEach(o=>{o.addEventListener("click",async()=>{const d=o.getAttribute("data-user-id")||"",p=o.getAttribute("data-restaurant-id")||"",m=o.getAttribute("data-display-name")||"this waiter";if(!d||!p||!window.confirm(`Reset progression for ${m}?`))return;const u=o.textContent;o.disabled=!0,o.textContent="Resetting…",a.textContent=`Resetting progression for ${m}…`;try{await wd({userId:d,restaurantId:p}),Pn(p),a.textContent=`Progression reset for ${m}.`}catch(f){a.textContent=`Failed to reset ${m}: ${f?.message||String(f)}`}finally{o.disabled=!1,o.textContent=u}})}),a.textContent=Vs()?`${i.length} of ${t.length} member(s) shown.`:`${t.length} member(s) loaded.`,Cn(),Kt(),Or?.(e),O("renderManagerBoardOverviewRitualStatusCard",()=>_r?.())}async function ft(e={}){const t=ue("premium"),n=j()||t.activeRestaurantId||t.profile?.restaurant_id||null,r=document.getElementById("mbMembersList"),a=document.getElementById("mbMembersMsg"),s=document.getElementById("mbPeopleSearch"),i=!!e?.force;if(!r||!a)return;if(Xa(),s&&s.value!==String(window.__BC_MB_PEOPLE_SEARCH__||"")&&(s.value=String(window.__BC_MB_PEOPLE_SEARCH__||"")),r.innerHTML="",a.textContent="",!n){a.textContent="No active restaurant selected.";return}if(Na(sn,xc,n)&&!i){ti(n,sn.rows||[],t);return}a.textContent="Loading members…";const{data:l,error:c}=await I.from("profiles").select("user_id, display_name, role, created_at").eq("restaurant_id",n).order("created_at",{ascending:!0});if(c){a.textContent="Failed to load members: "+(c.message||"unknown");return}const o=l||[];sn={rid:String(n),loadedAt:Date.now(),rows:o},ti(n,o,t)}function Qm(){const e=document.getElementById("mbRefreshMembers");!e||e.__wired||(e.__wired=!0,e.addEventListener("click",()=>ft({force:!0})))}function Jm(e){const t=document.getElementById("mbLeaderboard");if(t){if(!e.length){t.innerHTML='<div class="small-text">No performance data yet.</div>';return}t.innerHTML=e.map((n,r)=>`

    <div style="
      display:flex;
      justify-content:space-between;
      padding:6px 0;
      border-bottom:1px solid rgba(255,255,255,0.08);
    ">

      <div>
        <b>#${r+1}</b> ${y(n.name)}
      </div>

      <div style="opacity:.8;">
        ${n.avg}%
      </div>

    </div>

  `).join("")}}async function Xm(){const{restaurantId:e}=We();if(!e)return;const{data:t,error:n}=await I.from("bc_skill_snapshots_v1").select(`
      user_id,
      read_pct,
      framing_pct,
      delivery_pct,
      recovery_pct,
      closing_pct
    `).eq("restaurant_id",e).order("created_at",{ascending:!1}).limit(500);if(n){console.warn("[LEADERBOARD]",n);return}const r={},a=await se((t||[]).map(i=>i?.user_id).filter(Boolean));(t||[]).forEach(i=>{const l=i.user_id;r[l]||(r[l]={name:a.get(l)||l,total:0,count:0});const c=(i.read_pct+i.framing_pct+i.delivery_pct+i.recovery_pct+i.closing_pct)/5;r[l].total+=c,r[l].count+=1});const s=Object.values(r).map(i=>({name:i.name,avg:Math.round(i.total/i.count)})).sort((i,l)=>l.avg-i.avg).slice(0,10);Jm(s)}function Zm(e){const t=document.getElementById("mbWeeklyReport");if(!t)return;if(!e.length){t.innerHTML='<div class="small-text">No training data this week.</div>';return}const n={},r={read:0,framing:0,delivery:0,recovery:0,closing:0};e.forEach(c=>{const o=c.user_id;n[o]||(n[o]={name:c.__displayName||o,total:0,count:0});const d=(c.read_pct+c.framing_pct+c.delivery_pct+c.recovery_pct+c.closing_pct)/5;n[o].total+=d,n[o].count+=1,r.read+=c.read_pct,r.framing+=c.framing_pct,r.delivery+=c.delivery_pct,r.recovery+=c.recovery_pct,r.closing+=c.closing_pct});const s=Object.values(n).map(c=>({name:c.name,avg:c.total/c.count})).sort((c,o)=>o.avg-c.avg)[0]?.name||"—",l=Object.entries(r).map(([c,o])=>({skill:c,avg:o/e.length})).sort((c,o)=>c.avg-o.avg)[0]?.skill||"—";t.innerHTML=`
    <div style="display:flex; flex-direction:column; gap:6px;">

      <div>
        🏆 <b>Top waiter:</b> ${y(s)}
      </div>

      <div>
        📉 <b>Team focus area:</b> ${y(l)}
      </div>

      <div>
        📊 <b>Total reports analyzed:</b> ${e.length}
      </div>

      <div class="small-text" style="opacity:.7;">
        Recommendation: run focused drills on ${y(l)} this week.
      </div>

    </div>
  `}async function eg(){const{restaurantId:e}=We();if(!e)return[];const t=new Date;t.setDate(t.getDate()-7);const{data:n,error:r}=await I.from("bc_skill_snapshots_v1").select(`
      user_id,
      read_pct,
      framing_pct,
      delivery_pct,
      recovery_pct,
      closing_pct,
      created_at
    `).eq("restaurant_id",e).gte("created_at",t.toISOString());if(r)return console.warn("[WEEKLY REPORT]",r),[];const a=n||[],s=await se(a.map(l=>l?.user_id).filter(Boolean)),i=a.map(l=>({...l,__displayName:s.get(l?.user_id)||l?.user_id||null}));return Zm(i),i}function tg(e=new Date){const t=new Date(e),n=(t.getUTCDay()+6)%7;return t.setUTCDate(t.getUTCDate()-n),t.setUTCHours(0,0,0,0),t.toISOString().slice(0,10)}function tr(e){const t=String(e||"").toLowerCase();return t==="read"?"Reading":t==="framing"?"Framing":t==="delivery"?"Delivery":t==="recovery"?"Recovery":t==="closing"?"Closing":e||"—"}async function ng(e){try{const{restaurantId:t,isManager:n}=We();if(!n||!t||!Array.isArray(e)||!e.length)return;const r=_?.session?.user?.id||_?.session?.userId||null,a=F(_?.profile)||"single_manager";if(!r)return;const s=tg(),i=`bc_weekly_summary_sent_v1_${t}_${r}_${s}`;if(localStorage.getItem(i)==="1")return;const l={},c={read:0,framing:0,delivery:0,recovery:0,closing:0};e.forEach(R=>{const T=R.user_id;l[T]||(l[T]={name:R.__displayName||T,total:0,count:0});const A=(R.read_pct+R.framing_pct+R.delivery_pct+R.recovery_pct+R.closing_pct)/5;l[T].total+=A,l[T].count+=1,c.read+=R.read_pct,c.framing+=R.framing_pct,c.delivery+=R.delivery_pct,c.recovery+=R.recovery_pct,c.closing+=R.closing_pct});const d=Object.values(l).map(R=>({name:R.name,avg:R.total/R.count})).sort((R,T)=>T.avg-R.avg)[0]?.name||"—",m=Object.entries(c).map(([R,T])=>({skill:R,avg:T/e.length})).sort((R,T)=>R.avg-T.avg)[0]?.skill||"—",g=[...e].filter(R=>R?.created_at).sort((R,T)=>new Date(R.created_at)-new Date(T.created_at)),u=Math.max(1,Math.min(5,Math.floor(g.length/2)||1)),f=g.slice(0,u),h=g.slice(-u),w=["read_pct","framing_pct","delivery_pct","recovery_pct","closing_pct"],S=(R,T)=>R.length?R.reduce((W,H)=>W+Number(H?.[T]??0),0)/R.length:0;let E=-1/0,b="read";w.forEach(R=>{const T=S(h,R)-S(f,R);T>E&&(E=T,b=R.replace("_pct",""))});const B=["Weekly Training Summary","",`Top performer: ${d}`,`Most improved skill: ${tr(b)}`,`Recommended focus: ${tr(m)}`].join(`
`),L={scope_type:"restaurant",scope_id:Io()||t,restaurant_id:t,sender_user_id:r,receiver_user_id:r,sender_role:a,type:"weekly_summary",body:B,payload:{kind:"weekly_summary",weekStart:s,topPerformer:d,mostImprovedSkill:tr(b),recommendedFocus:tr(m),reportsAnalyzed:e.length}},{data:k,error:v}=await I.from("bc_messages_v1").select("id").eq("restaurant_id",t).eq("receiver_user_id",r).eq("type","weekly_summary").is("archived_at",null).order("created_at",{ascending:!1}).limit(1).maybeSingle();if(v){console.warn("[WEEKLY SUMMARY] lookup failed",v);return}if(k?.id){const{error:R}=await I.from("bc_messages_v1").update(L).eq("id",k.id);if(R){console.warn("[WEEKLY SUMMARY] update failed",R);return}}else{const{error:R}=await I.from("bc_messages_v1").insert(L);if(R){console.warn("[WEEKLY SUMMARY] insert failed",R);return}}localStorage.setItem(i,"1")}catch(t){console.warn("[WEEKLY SUMMARY] failed",t)}}async function ae(e=null,t={}){try{let n=function(C){const D=C.map(re=>!!re.is_green);let V=0;for(const re of D)if(re)V++;else break;let M=0,N=0;for(const re of D)re?(N++,N>M&&(M=N)):N=0;return{current:V,best:M,sampleN:D.length}};const r=Qa(e),a=!!t?.force,i=ue("premium").profile||{};if(!J(i).canAccessManagerBoard)throw new Error("Role cannot access manager board.");if(!Me(i,i,r))throw new Error("Role cannot act on this restaurant.");if(He(r),!_.restaurant||_.restaurant.id!==r)try{_.restaurant=await et(r)}catch{}try{await ls(r,{force:a})}catch(C){console.warn("[MB] wine cache refresh failed",C)}try{await Et()}catch(C){console.warn("[MB] timed challenge wine refresh failed",C)}if(document.getElementById("mbRestName").textContent=_.restaurant?.name||String(r).slice(0,8)+"…",document.getElementById("mbMsg").textContent="",pr(),O("renderManagerBoardOverviewRitualStatusCard",()=>_r?.()),Qm(),Na(or,Mc,r)&&!a){await ft(),O("renderManagerBoardOverviewRitualStatusCard",()=>_r?.()),pn();return}const[c]=await Promise.all([eg(),ft(),Xm()]);await ng(c),pn();const o="bc_sessions_v1",d="bc_messages_v1",p="bc_encounter_resolutions_v2",[m,g]=await Promise.all([I.from(o).select("session_id",{count:"exact",head:!0}).eq("restaurant_id",r),I.from(d).select("id",{count:"exact",head:!0}).eq("restaurant_id",r).eq("type","drill_completed").is("archived_at",null)]);if(m.error)throw m.error;if(g.error)throw g.error;document.getElementById("mbRunsTotal").textContent=String(m.count??0),document.getElementById("mbDrillsTotal").textContent=String(g.count??0);const[u,f]=await Promise.all([I.from(o).select("session_start, user_id, encounters_resolved, avg_chain_score, greens, yellows, reds").eq("restaurant_id",r).order("session_start",{ascending:!1}).limit(5),I.from(d).select("created_at, sender_user_id, payload").eq("restaurant_id",r).eq("type","drill_completed").is("archived_at",null).order("created_at",{ascending:!1}).limit(5)]);if(u.error)throw u.error;if(f.error)throw f.error;const h=[...(u.data||[]).map(C=>C.user_id).filter(Boolean),...(f.data||[]).map(C=>C.sender_user_id).filter(Boolean)],w=await se(h);console.log("[MB] nameMap",{requested:h.length,resolved:w.size});const S=[...(u.data||[]).map(C=>({t:C.session_start,line:`Session • ${De(C.user_id,w)} • ${C.encounters_resolved??0} resolved • avg chain score ${Number(C.avg_chain_score??0).toFixed(2)} • G/Y/R ratio: ${C.greens??0}/${C.yellows??0}/${C.reds??0}`})),...(f.data||[]).map(C=>({t:C.created_at,line:`Drill • ${De(C.sender_user_id,w)} • reps ${C.payload?.repsDone??"-"} / ${C.payload?.repTarget??"-"}`}))].filter(C=>C.t).sort((C,D)=>new Date(D.t)-new Date(C.t)).slice(0,8);document.getElementById("mbRecent").innerHTML=S.length?S.map(C=>`<div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
                  ${C.line}
                  <div style="opacity:.6; font-size:12px;">${C.t}</div>
                </div>`).join(""):'<div style="opacity:.8;">No activity yet.</div>';const b=await I.from(p).select("user_id, occurred_at, is_green").eq("restaurant_id",r).order("occurred_at",{ascending:!1}).limit(800);if(b.error)throw b.error;const B=new Map;for(const C of b.data||[]){if(!C?.user_id)continue;const D=B.get(C.user_id)||[];D.push(C),B.set(C.user_id,D)}const L=[];for(const[C,D]of B.entries()){const{current:V,best:M,sampleN:N}=n(D);L.push({userId:C,current:V,best:M,sampleN:N})}L.sort((C,D)=>D.best-C.best||D.current-C.current);const k=L.slice(0,5),v=await se(k.map(C=>C.userId)),R=document.getElementById("mbBestStreaks");R&&(R.innerHTML=k.length?k.map(C=>`<div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
                        <div><b>${De(C.userId,v)}</b> • best <b>${C.best}</b> • current <b>${C.current}</b></div>
                        <div style="opacity:.6; font-size:12px;">sampled last ${C.sampleN} resolves</div>
                      </div>`).join(""):'<div style="opacity:.8;">No streak data yet.</div>');const A=await I.from("bc_user_latest_v1").select("user_id, last10_count, last10_greens, last10_yellows, last10_reds, last10_avg_chain_score, latest_chain_signal, latest_tier, latest_grade, latest_occurred_at").eq("restaurant_id",r).order("latest_occurred_at",{ascending:!1}).limit(200);if(A.error)throw A.error;const W=(A.data||[]).map(C=>{const D=Number(C.last10_count??0),V=Number(C.last10_reds??0),M=Number(C.last10_avg_chain_score??0),N=V*3+(M<2.2?2:0)+(M<1.8?2:0)+(D>=8?1:0);return{user_id:C.user_id,attention:N,n:D,reds:V,avg:M,latest_signal:C.latest_chain_signal,latest_tier:C.latest_tier,latest_grade:C.latest_grade,latest_occurred_at:C.latest_occurred_at}}).sort((C,D)=>D.attention-C.attention||D.reds-C.reds||C.avg-D.avg).slice(0,5),H=await se(W.map(C=>C.user_id)),P=document.getElementById("mbNeedsCoaching");P&&(P.innerHTML=W.length?W.map(C=>{const D=De(C.user_id,H),V=[C.reds>0?`${C.reds} red(s) in last10`:null,Number.isFinite(C.avg)?`avg ${C.avg.toFixed(2)}`:null,C.latest_signal?`latest ${C.latest_signal}`:null,C.latest_tier?`tier ${C.latest_tier}`:null].filter(Boolean);return`<div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
                        <div><b>${D}</b> • ${V.join(" • ")}</div>
                        <div style="opacity:.6; font-size:12px;">${C.latest_occurred_at||""}</div>
                      </div>`}).join(""):'<div style="opacity:.8;">No coaching signals yet.</div>'),m.count,g.count,k.length,W.length,or={rid:String(r),loadedAt:Date.now()}}catch(n){console.error(n),document.getElementById("mbMsg").textContent=n?.message||"Failed to load manager board",n?.message||String(n)}}async function be(e="manual"){if(en)return en;if(!Pc(e)&&_?.session?.user&&_?.profile&&Date.now()-Number(As||0)<Ac){fn(!0),gr(),ha(),ya(),_a(),Ze?.();return}en=(async()=>{console.log("[AUTH] loadAuthedState using supabase",I.__BC_ID__,"storageKey",window.__BC_SUPABASE_STORAGE_KEY__);const{session:t,error:n}=await Z(ai(),8e3,"getSession");if(n)throw console.warn("[AUTH] getSession error",n),n;if(_.session=t||null,window.__LAST_USER_ID__&&window.__LAST_USER_ID__!==_.session?.user?.id&&we("user_changed"),window.__LAST_USER_ID__=_.session?.user?.id,_.profile=null,_.restaurant=null,_.invites=[],fn(!!t?.user),!t?.user){new Date().toISOString();return}const r=await $n(t.user.id);_.profile=r,await _o();try{const a=await Iu(r),s=String(r?.scope_type||"").toLowerCase();(s==="group"||s==="enterprise")&&(_.activeRestaurantId=a),a?_.restaurant=await et(a):_.restaurant=null,Ir(),Pa()}catch(a){console.warn("[BC] loadAuthedState: resolve/load restaurant failed",a),_.restaurant=null}Te==="premium"&&Fa(),Er(),new Date().toISOString(),t.user.id,t.user.email,_.activeRestaurantId,_.restaurant&&(_.restaurant.id,_.restaurant.name,_.restaurant.code),console.log("[BC] active restaurant resolved",{scope_type:_.profile?.scope_type,scope_id:_.profile?.scope_id,activeRestaurantId:_.activeRestaurantId,restaurant:_.restaurant?.id}),gr(),ha(),ya(),_a(),Ze?.(),As=Date.now()})();try{await en}finally{en=null}}function It(e){z.role=String(e||"").trim().toLowerCase()==="manager"?"manager":"waiter";const t=document.getElementById("roleTabs"),n=document.getElementById("tabRoleWaiter"),r=document.getElementById("tabRoleManager");t&&(t.dataset.selected=z.role,t.style.setProperty("--selector-x",z.role==="manager"?"calc(100% + 8px)":"0px")),z.role==="waiter"?(n.classList.add("active"),r.classList.remove("active")):(r.classList.add("active"),n.classList.remove("active")),z.role==="manager"&&!z.managerPackage&&(z.managerPackage="single_manager"),Wr()}function Mt(e){z.mode=e==="signup"?"signup":"login";const t=document.getElementById("modeTabs"),n=document.getElementById("roleTabsWrap"),r=document.getElementById("tabModeLogin"),a=document.getElementById("tabModeSignup");t&&(t.dataset.selected=z.mode,t.style.setProperty("--selector-x",z.mode==="signup"?"calc(100% + 8px)":"0px")),z.mode==="login"?(r.classList.add("active"),a.classList.remove("active")):(a.classList.add("active"),r.classList.remove("active"));const s=document.getElementById("displayNameWrap");z.mode==="signup"?(n&&n.classList.remove("hidden"),It("waiter"),s.classList.remove("hidden")):(n&&n.classList.add("hidden"),It("waiter"),s.classList.add("hidden")),Wr()}function Ur(e){const t=["single_manager","group_manager","enterpriser"].includes(String(e||"").trim().toLowerCase())?String(e).trim().toLowerCase():"single_manager";z.managerPackage=t;const n=document.getElementById("managerPackageTabs"),r=document.getElementById("tabManagerSingle"),a=document.getElementById("tabManagerGroup"),s=document.getElementById("tabManagerEnterprise");n&&(n.dataset.selected=t),r?.classList.toggle("active",t==="single_manager"),a?.classList.toggle("active",t==="group_manager"),s?.classList.toggle("active",t==="enterpriser"),Wr()}function Hr(e){const t=["15","30","60"].includes(String(e||""))?String(e):"15";z.seatPlan=t;const n=document.getElementById("seatPlanTabs"),r=document.getElementById("tabSeat15"),a=document.getElementById("tabSeat30"),s=document.getElementById("tabSeat60");n&&(n.dataset.selected=t),r?.classList.toggle("active",t==="15"),a?.classList.toggle("active",t==="30"),s?.classList.toggle("active",t==="60")}function Gr(e){const t=["3","5","7","10"].includes(String(e||""))?String(e):"3";z.restaurantCount=t;const n=document.getElementById("restaurantCountTabs"),r=document.getElementById("tabRestaurant3"),a=document.getElementById("tabRestaurant5"),s=document.getElementById("tabRestaurant7"),i=document.getElementById("tabRestaurant10");n&&(n.dataset.selected=t),r?.classList.toggle("active",t==="3"),a?.classList.toggle("active",t==="5"),s?.classList.toggle("active",t==="7"),i?.classList.toggle("active",t==="10")}function Wr(){const e=z.mode==="signup",t=e&&z.role==="manager",n=document.getElementById("premiumIntentBlock"),r=document.getElementById("signupContactBlock"),a=document.getElementById("managerSignupConfig"),s=document.getElementById("premiumRestaurantNameWrap"),i=document.getElementById("restaurantCountWrap"),l=t&&(z.managerPackage==="group_manager"||z.managerPackage==="enterpriser");n&&n.classList.toggle("hidden",ze!=="premium"),r&&r.classList.toggle("hidden",!e),a&&a.classList.toggle("hidden",!t),s&&s.classList.toggle("hidden",!(t&&z.managerPackage==="single_manager")),i&&i.classList.toggle("hidden",!l)}function Zo(){const e=document.getElementById("demoAuthedBadge"),t=document.getElementById("demoJoinBlock"),n=!!_.session?.user;e&&(n?e.classList.remove("hidden"):e.classList.add("hidden"));const r=String(_.profile?.role||"").toLowerCase(),a=!!_.profile?.restaurant_id;t&&(n&&r==="waiter"&&!a?t.classList.remove("hidden"):t.classList.add("hidden"))}async function rg(){try{xe();const e=ur(document.getElementById("demoJoinCode")?.value);if(!e)throw new Error("Enter a join code.");if(await be("demo.join.precheck"),!_.session?.user)throw new Error("Login as a waiter first.");if(String(_.profile?.role||"").toLowerCase()!=="waiter")throw new Error("Join-by-code is for waiter accounts.");if(_.profile?.restaurant_id)throw new Error("You are already assigned to a restaurant.");G("demoJoinMsg","Submitting..."),new Date().toISOString();const t=window.supabase||I,n=await Z(t.rpc("join_restaurant_by_code",{p_code:e}),15e3,"rpc.join_restaurant_by_code");if(n.error)throw n.error;if(!n.data?.ok){const r=n.data?.error||"unknown";throw r==="invalid_code"?new Error("Invalid join code."):r==="seat_limit_reached"?new Error("Seat limit reached for this restaurant."):r==="invite_required"?new Error("Invite required. Ask your manager to add your email."):r==="already_in_restaurant"?new Error("You are already assigned to a restaurant."):new Error("Join failed.")}G("demoJoinMsg","Success ✅ Premium unlocked.","success"),new Date().toISOString(),n.data.restaurant_id,await be("demo.join.refresh"),await _o(),Zo(),_.profile?.restaurant_id&&await Ct("demo.join.auto")}catch(e){console.error(e),G("demoJoinMsg",e?.message||"Join failed","error"),new Date().toISOString(),e?.message||String(e)}}let la=null,ni="",ca=!1;window.__BC_LOGOUT_INFLIGHT__=!1;window.__BC_LOGOUT_LAST_AT__=0;window.__BC_LOGGING_OUT__=!1;function xt(){return window.__BC_LOGGING_OUT__===!0}function oe(){return!!window.__BC_LOGGING_OUT__||!_?.session}async function el(e="manual"){xe(),le();const t=Te;Te="demo";try{await be(`routeDemo:${e}`)}catch{}t!=="demo"&&va("demo");const n=_?.profile;if(String(n?.access_tier||"").toLowerCase().startsWith("premium")){console.log("[BC] premium user -> skipping demo mount ✅");return}new Date().toISOString(),_.session?.user,K("screenGameDemo"),Zo(),uo("gameRootDemo","demo")}async function Fr(e="manual"){if(oe()){console.warn("[BC] routePremium blocked: hard logged out");return}const t=Date.now();if(ea||t-Ts<250)return;Ts=t,ea=!0;const n=Te;try{if(oe()||(xe(),ci(),await be(`routePremium:${e}`),oe())||(await Wa(),oe()))return;if(!_.session?.user){le(),K("screenHome"),G("authMsg","Login first, then press Premium.","error");return}const r=_.profile;if(r?.restaurant_id){if(Ue(r?.role)&&_.restaurant?.id)try{_.invites=await xr(j()),Sn(_.invites)}catch{_.invites=[],Sn([])}else _.invites=[];Tt(),Te="premium",n!=="premium"&&va("premium"),wa("decideRoute:restaurant-member->premium"),K("screenPremiumApp");const d=_?.profile,p=String(d?.access_tier||"").toLowerCase().startsWith("premium"),m=String(d?.scope_type||"").toLowerCase(),u=(m==="group"||m==="enterprise")&&!_.activeRestaurantId;if(p&&u){console.log("[BC] scope manager needs active restaurant -> Manager Board"),K("screenManagerBoard");return}Wt({mode:"premium"});try{mr("bc_ctx",{userId:_.session?.user?.id||null,restaurantId:_.activeRestaurantId||_.profile?.restaurant_id||null,scopeId:_.profile?.scope_id||null,role:_.profile?.role||null,mode:"premium"})}catch{}fa(),$t();return}const a=eo(r);if(!a.ok){await el(`premium.block.${a.reason}`),G("demoJoinMsg","Premium is locked. Join a restaurant to unlock Premium. You can keep playing Demo.","error");return}if(Ue(r?.role)&&!r?.restaurant_id){Te="premium",le(),K("screenCreateRestaurant");return}Tt(),Te="premium",n!=="premium"&&va("premium"),wa("decideRoute:premium-entitled"),K("screenPremiumApp"),fa();const s=_?.profile,i=String(s?.access_tier||"").toLowerCase().startsWith("premium"),l=String(s?.scope_type||"").toLowerCase(),o=(l==="group"||l==="enterprise")&&!_.activeRestaurantId;if(i&&o){console.log("[BC] scope manager needs active restaurant -> Manager Board"),K("screenManagerBoard");return}Wt({mode:"premium"});try{mr("bc_ctx",{userId:_.session?.user?.id||null,restaurantId:_.activeRestaurantId||_.profile?.restaurant_id||null,scopeId:_.profile?.scope_id||null,role:_.profile?.role||null,mode:"premium"})}catch{}$t()}catch(r){console.error(r),new Date().toISOString(),r.message||String(r),le(),K("screenHome"),G("authMsg","Premium routing failed — check debug panel.","error")}finally{ea=!1}}async function qr(e="manual"){if(xe(),le(),await be(`routeManagerBoard:${e}`),!J(_.profile).canAccessManagerBoard){F(_.profile),G("authMsg","Manager Board is manager-only.","error"),K("screenPremiumApp");return}const n=window.__BC_ACTIVE_MANAGER_RESTAURANT_ID__||_?.restaurant?.id||_?.profile?.restaurant_id||_?.profile?.restaurantId||null;n&&He(n),await Ka?.(),po?.(),uu?.(),wa("routeManagerBoard"),window.__BC_MB_DEFAULTTAB__=window.__BC_MB_DEFAULTTAB__||"overview",K("screenManagerBoard"),Lr(),wn(),mo(),await Ia(),vn(),Ee({keepStatus:!0});const r=Qa();window.__BC_MB_SHOWTAB__?.(window.__BC_MB_DEFAULTTAB__),await(window.__BC_MB_LOADTAB__?.(window.__BC_MB_DEFAULTTAB__)||ae(r)),await kn?.(r),vr(),go()}async function ag(e="profile_leaderboard"){xe(),le(),await be(`routeProfilePerformanceLeaderboard:${e}`);const t=_?.profile||{},n=String(F(t)||"").toLowerCase(),r=j()||_?.activeRestaurantId||_?.restaurant?.id||t?.restaurant_id||t?.restaurantId||null;if(!r){G("authMsg","No restaurant is attached to this profile yet.","error");return}He(r);try{const a=await et(r);a&&(_.restaurant=a)}catch(a){console.warn("[PROFILE] loadRestaurant for leaderboard failed",a)}if(window.__BC_MB_DEFAULTTAB__="performance",n==="waiter"){await Jd();return}await qr(e)}function sg(){return!!window.appState?.session}function ig(){console.log("[ROUTE] demo (no auth)"),K("screenGameDemo"),Ye(!1),we("routeDemoShellNoAuth"),window.__BC_DRILL_CONFIG__=null,window.BC_DRILL_CONFIG=null,Ht(),gt("routeDemoShellNoAuth:pre"),uo("gameRootDemo","demo")}function Ln(){console.log("[ROUTE] auth (no user)"),we("routeAuth"),gt("routeAuth"),Ye(!1),window.__BC_DRILL_CONFIG__=null,window.BC_DRILL_CONFIG=null,Ht(),le(),xe(),fn(!1),Mt("login"),Ge("login");try{const e=new URL(window.location.href);e.searchParams.delete("demo"),e.searchParams.delete("mode"),window.history.replaceState({},"",e.pathname)}catch{}K("screenHome"),Zi()}function og(e="home_shell",t=""){console.log("[ROUTE] home shell",{reason:e,authed:!!_?.session?.user}),we(`routeHomeShell:${e}`),gt(`routeHomeShell:${e}`),Ye(!1),window.__BC_DRILL_CONFIG__=null,window.BC_DRILL_CONFIG=null,Ht(),le(),xe(),Mt("login"),Ge("login"),K("screenHome"),Zi(),t&&G("authMsg",t,"normal")}async function Ct(e="decideRoute"){if(oe()){console.warn("[BC] decideRoute blocked (hard logged out)",e);return}xe();try{if(await be(e),oe()||(await Wa(),oe()))return;if(!sg()){if(Te="public",window.__BC_FORCE_AUTH__){window.__BC_FORCE_AUTH__=!1,Ln(),new Date().toISOString();return}Ln(),new Date().toISOString();return}if(_.profile?.restaurant_id){Ge("premium"),await Fr(`decideRoute.restaurant:${e}`);return}if(!eo(_.profile||{}).ok){await el(`decideRoute.no_restaurant.demo:${e}`);return}og(`decideRoute.no_restaurant:${e}`,"Finish login or Premium setup on the parent screen before entering the game.")}catch(t){console.error(t),le(),K("screenHome"),new Date().toISOString(),t?.message||String(t)}}function lg(){const e=window.appState||{},t=e.session?.user?.id||"",n=e.profile?.role||"",r=window.getActiveRestaurantId?.()||e.profile?.restaurant_id||"";return[t,n,r].join("|")}async function cg(e=""){if(ca)return;const t=lg();if(!(t&&t===ni)){ni=t,ca=!0;try{await Ct(e)}finally{ca=!1}}}function jr(){const e=document.getElementById("invitesList");if(!e)return;const t=Ja();if(!t.length){e.innerHTML='<div style="opacity:.8;">No waiters added yet.</div>';return}e.innerHTML=t.map(n=>{const r=n.status,a=n.email,s=r==="accepted"?"accepted":r==="revoked"?"revoked":"pending",i=r==="revoked"?`<button data-action="reinvite" data-email="${a}" style="font-size:12px;">Re-add</button>`:`<button data-action="revoke" data-email="${a}" style="font-size:12px;">Remove</button>`;return`
        <div style="display:flex; justify-content:space-between; gap:10px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="min-width:0;">
            <div style="font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${a}</div>
            <div style="font-size:12px; opacity:.75;">${s}</div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            ${i}
          </div>
        </div>
      `}).join(""),e.querySelectorAll("button[data-action]").forEach(n=>{n.addEventListener("click",async()=>{const r=n.getAttribute("data-action"),a=n.getAttribute("data-email");a&&(r==="revoke"&&await fg(a),r==="reinvite"&&await rl(a))})})}function ms(){const e=document.getElementById("mbInviteSummary");if(!e)return;const t=Ja(),n=t.filter(a=>String(a?.status||"")==="pending").length,r=t.filter(a=>String(a?.status||"")==="accepted").length;e.innerHTML=`
    <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
      <div style="font-weight:600;">Invites</div>
      <div><b>Pending invites:</b> ${n}</div>
      <div style="margin-top:4px;"><b>Accepted invites:</b> ${r}</div>
    </div>
  `}async function kn(e=null){const t=Qa(e),n=await xr(t);Sn(n),_.invites=n,await Be(t),ce?.({thread:!0,board:!0,economy:!1,liveControls:!1,challengeMeta:!0});const r=_?.profile||{};if(J(r).canManageMultipleRestaurants){try{const s=await Lu();ia(s)}catch(s){console.warn("[MB] loadGroupManagerMetrics failed",s),ia(null)}try{const s=await ku();oa(s)}catch(s){console.warn("[MB] loadGroupManagerRestaurantComparisonRows failed",s),oa([])}}else ia(null),oa([]);po?.(),au?.(),O("renderGroupOverviewCard",()=>su?.()),O("renderGroupMetricsCard",()=>iu?.()),O("renderGroupRestaurantComparisonCard",()=>ou?.()),O("wireGroupRestaurantComparisonCard",()=>du?.()),O("renderManagerPeopleSummary",()=>Cn?.()),O("renderInvitesList",()=>jr?.()),O("renderManagerBoardInviteSummary",()=>ms?.()),O("renderManagerBoardOverviewLiveEffects",()=>un?.()),O("renderManagerLiveEffectsPanels",()=>Fi?.()),O("pushLiveEffectsToGame",()=>xo?.()),O("renderManagerBoardOverviewTimedChallenge",()=>xi?.()),O("renderManagerBoardRecentChallenges",()=>Wi?.()),O("renderTimedChallengeRecentSummary",()=>Dn?.()),fm?.(),Mn?.(),Go?.(),Tt?.()}async function tl(){const e=Mr();if(!e.userId||!e.restaurantId)return{read:0,framing:0,delivery:0,recovery:0,closing:0};const{data:t,error:n}=await I.from("bc_skill_snapshots_v1").select(`
      read_pct,
      framing_pct,
      delivery_pct,
      recovery_pct,
      closing_pct,
      created_at
    `).eq("user_id",e.userId).eq("restaurant_id",e.restaurantId).order("created_at",{ascending:!1}).limit(1).maybeSingle();return n||!t?{read:0,framing:0,delivery:0,recovery:0,closing:0}:{read:Number(t.read_pct||0),framing:Number(t.framing_pct||0),delivery:Number(t.delivery_pct||0),recovery:Number(t.recovery_pct||0),closing:Number(t.closing_pct||0)}}async function nl(){const e=await tl(),t=(l,c)=>{const o=document.getElementById(l);o&&(o.textContent=`${c}%`)};t("hudSkillRead",e.read??0),t("hudSkillFraming",e.framing??0),t("hudSkillDelivery",e.delivery??0),t("hudSkillRecovery",e.recovery??0),t("hudSkillClosing",e.closing??0);const n=[{key:"read",label:"Reading",val:e.read??0},{key:"framing",label:"Framing",val:e.framing??0},{key:"delivery",label:"Delivery",val:e.delivery??0},{key:"recovery",label:"Recovery",val:e.recovery??0},{key:"closing",label:"Closing",val:e.closing??0}].sort((l,c)=>c.val-l.val),r=n[0],a=n[n.length-1],s=document.getElementById("hudSkillSummary");s&&(s.textContent=`Strongest: ${r.label} (${r.val}%) • Needs work: ${a.label} (${a.val}%)`);const i=document.getElementById("hudSkillRadar");i&&typeof Ta=="function"&&Ta(i,e),ps()}function dg(){const e=_?.difficulty??null;if(e==null)return"Medium";const t=Number(e);return t<=1?"Easy":t>=3?"Hard":"Medium"}function ug(){const e=_?.difficulty??null;if(e==null)return 2;const t=Number(e);return t<=1?1:t>=3?3:2}function da(e){const t=Number(e),n=t<=1?1:t>=3?3:2;_.difficulty=n;try{Uc(_?.profile?.user_id||_?.session?.user?.id||null,j?.()||_?.activeRestaurantId||_?.restaurant?.id||_?.profile?.restaurant_id||null,n)}catch{}try{mr?.("difficulty_set",{difficulty:n})}catch(r){console.warn("[HUD] difficulty post failed",r)}gs?.()}function gs(){const e=document.getElementById("btnDifficultyEasy"),t=document.getElementById("btnDifficultyMedium"),n=document.getElementById("btnDifficultyHard"),r=document.getElementById("hudDifficultyStatus"),a=ug();e&&e.classList.toggle("active",a===1),t&&t.classList.toggle("active",a===2),n&&n.classList.toggle("active",a===3),r&&(r.textContent=`Current: ${dg()}`)}function mg(){const e=document.getElementById("btnDifficultyEasy");e&&!e.__wired&&(e.__wired=!0,e.addEventListener("click",()=>da(1)));const t=document.getElementById("btnDifficultyMedium");t&&!t.__wired&&(t.__wired=!0,t.addEventListener("click",()=>da(2)));const n=document.getElementById("btnDifficultyHard");n&&!n.__wired&&(n.__wired=!0,n.addEventListener("click",()=>da(3)))}async function ps(){const e=Mr(),t=Xd(),n=e.restaurantId||null;if(!t||!n)return;const{data:r,error:a}=await I.from("bc_skill_snapshots_v1").select(`
      created_at,
      read_pct,
      framing_pct,
      delivery_pct,
      recovery_pct,
      closing_pct
    `).eq("user_id",t).eq("restaurant_id",n).order("created_at",{ascending:!1}).limit(5);if(a){console.warn("[HUD TIMELINE]",a);return}pg(r||[])}async function gg(){const e=document.getElementById("hudTimelineUserSelect"),t=document.getElementById("hudTimelineTitle");if(!e)return;const n=_.profile||{},r=String(F(n)||"").toLowerCase();if(!(r==="single_manager"||r==="group_manager"||r==="enterpriser")){e.classList.add("hidden"),e.style.display="none",t&&(t.textContent="Recent Progress");return}const s=j?.()||_?.restaurant?.id||null;if(!s){e.classList.add("hidden"),e.style.display="none",t&&(t.textContent="Recent Progress");return}const i=Mr().userId||null,l=_.profile||{},[c,o]=await Promise.all([I.from("profiles").select("user_id, display_name, role").eq("restaurant_id",s).order("display_name",{ascending:!0}),I.from("bc_skill_snapshots_v1").select("user_id, created_at").eq("restaurant_id",s).order("created_at",{ascending:!1}).limit(500)]);if(c.error){console.warn("[HUD TIMELINE SELECT]",c.error),e.classList.add("hidden"),e.style.display="none",t&&(t.textContent="Recent Progress");return}o.error&&console.warn("[HUD TIMELINE SELECT][SNAPSHOTS]",o.error);const d=Array.isArray(c.data)?c.data:[],p=Array.isArray(o.data)?o.data:[],m=new Map;for(const w of d){if(String(w?.role||"").toLowerCase()==="demo")continue;const E=String(w?.user_id||"");E&&m.set(E,{uid:E,label:w?.display_name||E})}for(const w of p){const S=String(w?.user_id||"");!S||m.has(S)||m.set(S,{uid:S,label:S})}const g=String(F(l)||l?.role||"").toLowerCase();if(i&&g!=="demo"&&!m.has(String(i))){const w=l?.display_name||_?.session?.user?.user_metadata?.display_name||_?.session?.user?.user_metadata?.full_name||(_?.session?.user?.email?String(_.session.user.email).split("@")[0]:"")||String(i);m.set(String(i),{uid:String(i),label:w})}const u=Array.from(m.keys()),f=await se(u),h=u.map(w=>{const S=m.get(w);return{uid:w,label:f.get(w)||S?.label||w||"Unknown"}}).sort((w,S)=>String(w.label).localeCompare(String(S.label)));if(!h.length){e.classList.add("hidden"),e.style.display="none",t&&(t.textContent="Recent Progress");return}e.innerHTML=h.map(w=>{const S=String(window.__BC_HUD_TIMELINE_TARGET_USER_ID__||i||"")===String(w.uid)?" selected":"";return`<option value="${w.uid}"${S}>${y(w.label)}</option>`}).join(""),e.classList.remove("hidden"),e.style.display="inline-block",t&&(t.textContent="Performance History"),e.onchange=()=>{window.__BC_HUD_TIMELINE_TARGET_USER_ID__=e.value||i||null,ps()}}function pg(e){const t=document.getElementById("hudTimelineList");if(!t)return;if(!e.length){t.innerHTML='<div style="opacity:.7;">No progress reports yet.</div>';return}const n=(r,a)=>a?r>a?"↑":r<a?"↓":"→":"→";t.innerHTML=e.map((r,a)=>{const s=e[a+1],i=n(r.read_pct,s?.read_pct),l=n(r.recovery_pct,s?.recovery_pct);return`
      <div style="
        padding:6px 8px;
        border:1px solid rgba(255,255,255,0.08);
        border-radius:8px;
        background:rgba(255,255,255,0.03);
      ">

        <div style="display:flex; justify-content:space-between;">
          <div>${new Date(r.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
          <div style="opacity:.7;">Encounter Progress</div>
        </div>

        <div style="margin-top:4px;">
          Reading ${r.read_pct}% ${i}
          &nbsp;&nbsp;|&nbsp;&nbsp;
          Recovery ${r.recovery_pct}% ${l}
        </div>

      </div>
    `}).join("")}function Tt(){const e=_.profile||{},t=F(e)||"-",n=J(e),r=j(),a=_.restaurant;r&&_?.restaurant?.id&&String(_.restaurant.id)!==String(r)&&(_.restaurant.id=r),document.getElementById("hudRole").textContent=rt(e),document.getElementById("hudRestName").textContent=a?.name||r||"-",document.getElementById("hudJoinCode").textContent=a?.code||"-",document.getElementById("hudSeatLimit").textContent=a?.seat_limit??"-",document.getElementById("hudRequireInvite").textContent=a?a.require_invite?"Yes":"No":"-";const s=document.getElementById("btnManagerBoard");s&&s.classList.toggle("hidden",!n.canAccessManagerBoard);const i=document.getElementById("btnOpenMessages");i&&i.classList.remove("hidden");const l=document.getElementById("btnWaiterPerformanceLeaderboard");l&&l.classList.toggle("hidden",String(t).toLowerCase()!=="waiter");const c=document.getElementById("premiumBadge");c&&(c.textContent=`PREMIUM • ${String(t).toUpperCase()}`);const o=document.querySelector("#hudSkillsCard > div"),d=document.getElementById("hudTimelineTitle"),p=String(t).toLowerCase(),m=p==="single_manager"||p==="group_manager"||p==="enterpriser";o&&(o.textContent=m?"Your Personal Skills":"Your Skills"),d&&!m&&(d.textContent="Recent Progress");const g=document.getElementById("managerOnlyBlock"),u=document.getElementById("hudJoinRow"),f=document.getElementById("hudCopyRow"),h=n.canInviteWaiters||n.canReadInvites||n.canAccessManagerBoard;g?.classList.toggle("hidden",!h),u?.classList.toggle("hidden",!n.canReadInvites),f?.classList.toggle("hidden",!n.canReadInvites);const w=document.getElementById("toggleRequireInvite");w&&a&&(w.checked=!!a.require_invite);const S=document.getElementById("seatLimitInput");S&&a&&(S.value=String(a.seat_limit??"")),_g(),jr(),gg?.(),nl(),Cr(),gs?.(),mg?.()}function _g(){const e=F(_?.profile||null)||"waiter",t=document.getElementById("managerSetupSection"),n=document.getElementById("mbGroupSetupCard"),r=document.getElementById("mbProvisionAccess"),a=e==="single_manager",s=e==="single_manager"||e==="group_manager",i=a||s;t?.classList.toggle("hidden",!i),n?.classList.toggle("hidden",!a),r?.classList.toggle("hidden",!s)}async function rl(e){try{G("hudMsg","");const t=qa(e);if(!t)throw new Error("Enter a valid email.");const n=_.restaurant,r=j(),a=_.session,s=_.profile||{},i=J(s);if(!r)throw new Error("Restaurant not loaded.");if(!a?.user)throw new Error("Not logged in.");if(!i.canInviteWaiters)throw new Error("Role cannot invite waiters.");if(!Me(s,s,r))throw new Error("Role cannot act on this restaurant.");const l=await Z(I.rpc("create_restaurant_invite",{p_restaurant_id:r,p_email:t}),12e3,"create_restaurant_invite");if(l.error)throw l.error;const c=l.data||null;if(!c?.ok)throw new Error(c?.error||"Invite failed");_.invites=await xr(r),Sn(_.invites),jr(),ms(),G("hudMsg",`Added: ${t}`,"success")}catch(t){console.error(t),G("hudMsg",t?.message||"Add failed","error")}}async function fg(e){try{G("hudMsg","");const t=qa(e);if(!t)throw new Error("Invalid email.");const n=_.restaurant,r=_.session,a=J(_.profile);if(!n?.id)throw new Error("Restaurant not loaded.");if(!r?.user)throw new Error("Not logged in.");if(!a.canInviteWaiters)throw new Error("Role cannot invite waiters.");if(!Me(_?.profile,_?.profile,n.id))throw new Error("Role cannot act on this restaurant.");const s=await Z(I.from("restaurant_invites").update({status:"revoked",revoked_at:new Date().toISOString(),revoked_by:r.user.id}).eq("restaurant_id",n.id).eq("email",t),12e3,"invites.update(revoke)");if(s.error)throw s.error;_.invites=await xr(n.id),Sn(_.invites),jr(),ms(),G("hudMsg",`Removed: ${t}`,"success")}catch(t){console.error(t),G("hudMsg",t?.message||"Remove failed","error")}}async function yg(){try{G("hudMsg","");const e=_.restaurant,t=J(_.profile);if(!e?.id)throw new Error("Restaurant not loaded.");if(!t.canReadInvites)throw new Error("Role cannot manage invite settings.");if(!Me(_?.profile,_?.profile,e.id))throw new Error("Role cannot act on this restaurant.");const n=!!document.getElementById("toggleRequireInvite")?.checked,r=await Z(I.from("restaurants").update({require_invite:n}).eq("id",e.id).select().single(),12e3,"restaurants.update(require_invite)");if(r.error)throw r.error;_.restaurant=r.data,Tt(),G("hudMsg","Saved.","success")}catch(e){console.error(e),G("hudMsg",e?.message||"Save failed (RLS may block updates)","error")}}async function hg(){try{G("hudMsg","");const e=_.restaurant,t=J(_.profile);if(!e?.id)throw new Error("Restaurant not loaded.");if(!t.canUseManagerAbilities)throw new Error("Role cannot manage restaurant settings.");if(!Me(_?.profile,_?.profile,e.id))throw new Error("Role cannot act on this restaurant.");const n=document.getElementById("seatLimitInput")?.value,r=n?parseInt(n,10):NaN;if(!Number.isFinite(r)||r<1)throw new Error("Seat limit must be >= 1.");const a=await Z(I.from("restaurants").update({seat_limit:r}).eq("id",e.id).select().single(),12e3,"restaurants.update(seat_limit)");if(a.error)throw a.error;_.restaurant=a.data,Tt(),G("hudMsg","Saved.","success")}catch(e){console.error(e),G("hudMsg",e?.message||"Save failed (RLS may block updates)","error")}}async function wg(){try{xe();const e=(document.getElementById("restName").value||"").trim();if(!e)throw new Error("Restaurant name is required.");G("createRestMsg","Creating...");const t=await Z(I.rpc("create_restaurant",{p_name:e}),15e3,"rpc.create_restaurant");if(t.error)throw t.error;if(!t.data?.ok)throw new Error(t.data?.error||"Create failed");const n=t.data.restaurant;document.getElementById("invitePanel").classList.remove("hidden"),document.getElementById("inviteCodeText").textContent=n.code,G("createRestMsg","Created ✅","success"),await Ct("restaurant.create.ok")}catch(e){console.error(e),G("createRestMsg",e?.message||"Create failed","error")}}async function ri(){if(ze!=="premium")return{attempted:!1,ok:!1};const e=document.getElementById("premiumLicenseCode")?.value,t=ur(e);if(!t)return{attempted:!1,ok:!1};const n=(document.getElementById("premiumRestaurantName")?.value||"").trim(),r={p_code:t,p_restaurant_name:n||null},a=await Z(I.rpc("claim_license_code",r),15e3,"rpc.claim_license_code");if(a.error)throw a.error;if(a.data?.ok!==!0){const s=a.data?.error||"Code failed";throw s==="need_restaurant_name"?new Error("Enter your restaurant name to finish setup."):new Error(s)}return{attempted:!0,ok:!0,data:a.data}}async function bg(){try{xe();const e=qa(document.getElementById("authEmail").value),t=document.getElementById("authPassword").value||"",n=(document.getElementById("authDisplayName").value||"").trim();if(!e)throw new Error("Enter email.");if(!t)throw new Error("Enter password.");const r=z.role==="waiter"?"waiter":z.managerPackage;if(z.mode==="login"){G("authMsg","Logging in...");const i=await Z(vl(e,t),15e3,"auth.signIn");if(i.error)throw i.error;await be("login.ok"),ze==="premium"&&ur(document.getElementById("premiumLicenseCode")?.value)&&(G("authMsg","Applying Premium code..."),await ri(),await be("login.claim.refresh"),G("authMsg","Premium code applied ✅","success"));const l=String(_.profile?.role||"").toLowerCase();It(l==="waiter"?"waiter":"manager"),await Ct("login.ok.decideRoute");return}G("authMsg","Creating account...");const{error:a}=await Z(Sl(e,t,{role:r,display_name:n||null,desired_package_tier:z.role==="manager"?z.managerPackage:null,desired_seat_plan:z.role==="manager"?z.seatPlan:null,desired_restaurant_count:z.role==="manager"&&["group_manager","enterpriser"].includes(z.managerPackage)?Number(z.restaurantCount||3):null,access_intent:ze}),15e3,"auth.signUp");if(a)throw a;const{session:s}=await ai();if(s?.user&&ze==="premium"&&ur(document.getElementById("premiumLicenseCode")?.value)){G("authMsg","Account created. Applying Premium code..."),await be("signup.ok"),await ri(),await be("signup.claim.refresh"),G("authMsg","Account created and Premium code applied ✅","success"),await Ct("signup.ok.decideRoute");return}G("authMsg","Account created. If email confirmation is ON, confirm then Login.","success"),Mt("login")}catch(e){console.error(e),G("authMsg",e?.message||"Auth failed","error")}}async function Ft(e="user"){if(!window.__BC_LOGGING_OUT__){window.__BC_LOGGING_OUT__=!0,console.warn("[LOGOUT] start",e);try{localStorage.setItem("__BC_LOGOUT_LOCK__",String(Date.now()))}catch{}window.__BC_LOGOUT_LOCK__=Date.now();try{const t=window.location.origin,n=r=>{const a=document.getElementById(r)?.contentWindow;a&&(a.postMessage({source:"BC_MSG",v:1,type:"auth_state",authed:!1},t),a.postMessage({source:"BC_MSG",v:1,type:"parent_logged_out"},t))};n("premiumRootFrame"),n("gameRootDemoFrame")}catch{}try{we("logout")}catch(t){console.warn("destroyPremiumIframe failed",t)}try{Ln()}catch(t){console.warn("routeAuth failed",t)}try{await El(),console.warn("[LOGOUT] supabase signOut ok")}catch(t){console.warn("[LOGOUT] supabase signOut failed (continuing anyway)",t)}try{bl()}catch{}try{localStorage.removeItem("bc_supabase_auth_v1"),sessionStorage.removeItem("bc_supabase_auth_v1");for(let t=localStorage.length-1;t>=0;t--){const n=localStorage.key(t);n&&n.startsWith("sb-")&&n.includes("auth-token")&&localStorage.removeItem(n)}for(let t=sessionStorage.length-1;t>=0;t--){const n=sessionStorage.key(t);n&&n.startsWith("sb-")&&n.includes("auth-token")&&sessionStorage.removeItem(n)}}catch{}window.location.replace("/?loggedOut=1&ts="+Date.now())}}window.doLogout=Ft;console.log("doLogout is",window.doLogout);function vg(){if(window.__BC_LOGOUT_WIRED__)return;window.__BC_LOGOUT_WIRED__=!0;const e=new Set(["btnHomeLogout","btnLogoutCreate","btnLogoutPremium","btnLogoutManagerBoard"]);window.addEventListener("click",t=>{const n=t.target?.closest?.("button");if(!(!n||!e.has(n.id))){console.log("[LOGOUT] captured",n.id),t.preventDefault(),t.stopPropagation(),t.stopImmediatePropagation?.();try{n.disabled=!0}catch{}(window.doLogout||Ft)("ui:"+n.id)}},!0),console.log("[LOGOUT] delegation armed ✅")}function Sg(){window.__BC_DEMO_EXIT_WIRED__||(window.__BC_DEMO_EXIT_WIRED__=!0,document.addEventListener("click",e=>{const t=e.target?.closest?.("button");!t||t.id!=="btnDemoExit"||(console.log("[UI] Demo exit captured ✅"),e.preventDefault(),e.stopPropagation(),e.stopImmediatePropagation?.(),Ln())},!0))}function al(){const e=document.getElementById("btnDemoPremium"),t=document.getElementById("btnDemoExit");t?(t.classList.remove("hidden"),t.textContent!=="Logout"&&(t.textContent="Logout"),t.onclick=null,t.__bcBound||(t.__bcBound=!0,t.addEventListener("click",async n=>{n.preventDefault(),n.stopPropagation(),console.log("[DEMO] Logout clicked ✅"),await Ft("demo_logout")}))):console.warn("[DEMO] btnDemoExit not found (yet)"),e&&(e.onclick=null,e.__bcBound||(e.__bcBound=!0,e.addEventListener("click",async n=>{n.preventDefault(),n.stopPropagation(),console.log("[DEMO] Premium clicked"),Ge("premium"),await Fr("demo.premium")})))}document.getElementById("btnHomePremium").addEventListener("click",async()=>{if(!_.session?.user){ze==="premium"?(Ge("login"),G("authMsg","","normal")):(Ge("premium"),G("authMsg","Premium selected. Login below and enter your Premium code.","success"));return}await Fr("home.premium")});document.getElementById("btnHomeExitPremium").addEventListener("click",()=>{Ge("login"),G("authMsg","","normal")});document.getElementById("btnAuthSubmit").addEventListener("click",bg);document.getElementById("tabRoleWaiter").addEventListener("click",()=>It("waiter"));document.getElementById("tabRoleManager").addEventListener("click",()=>It("manager"));document.getElementById("tabModeLogin").addEventListener("click",()=>Mt("login"));document.getElementById("tabModeSignup").addEventListener("click",()=>Mt("signup"));document.getElementById("tabManagerSingle")?.addEventListener("click",()=>Ur("single_manager"));document.getElementById("tabManagerGroup")?.addEventListener("click",()=>Ur("group_manager"));document.getElementById("tabManagerEnterprise")?.addEventListener("click",()=>Ur("enterpriser"));document.getElementById("tabSeat15")?.addEventListener("click",()=>Hr("15"));document.getElementById("tabSeat30")?.addEventListener("click",()=>Hr("30"));document.getElementById("tabSeat60")?.addEventListener("click",()=>Hr("60"));document.getElementById("tabRestaurant3")?.addEventListener("click",()=>Gr("3"));document.getElementById("tabRestaurant5")?.addEventListener("click",()=>Gr("5"));document.getElementById("tabRestaurant7")?.addEventListener("click",()=>Gr("7"));document.getElementById("tabRestaurant10")?.addEventListener("click",()=>Gr("10"));document.getElementById("btnDemoJoin").addEventListener("click",rg);document.getElementById("btnCreateRestaurant").addEventListener("click",wg);document.getElementById("btnCopyCode").addEventListener("click",async()=>{try{const e=(document.getElementById("inviteCodeText").textContent||"").trim();if(!e)throw new Error("No code yet.");await navigator.clipboard.writeText(e),G("inviteMsg","Copied ✅","success")}catch(e){G("inviteMsg",e?.message||"Copy failed","error")}});document.getElementById("btnEnterPremium").addEventListener("click",()=>Ct("enterPremium"));fa();gr();ha();ya();ed();td();od();document.getElementById("btnOpenHud")?.addEventListener("click",()=>{on?.(),Pd(),Tt()});document.getElementById("btnWaiterPerformanceLeaderboard")?.addEventListener("click",async()=>{await ag("waiter_nav_button")});document.getElementById("btnCloseWaiterLeaderboard")?.addEventListener("click",io);document.getElementById("btnCloseHud")?.addEventListener("click",()=>{le(),K("screenPremiumApp")});document.getElementById("hudBackdrop")?.addEventListener("click",le);document.getElementById("btnBackToPremium")?.addEventListener("click",()=>{K("screenPremiumApp")});document.getElementById("btnBackFromProfile")?.addEventListener("click",Br);document.getElementById("screenProfile")?.addEventListener("click",e=>{e.target?.id==="screenProfile"&&Br()});document.getElementById("screenWaiterLeaderboard")?.addEventListener("click",e=>{e.target?.id==="screenWaiterLeaderboard"&&io()});document.getElementById("btnLogoutProfile")?.addEventListener("click",async()=>{await Ft("profile_logout")});document.getElementById("btnCopyHudCode").addEventListener("click",async()=>{try{const e=_.restaurant?.code;if(!e)throw new Error("No code loaded.");await navigator.clipboard.writeText(e),G("hudMsg","Copied ✅","success")}catch(e){G("hudMsg",e?.message||"Copy failed","error")}});document.getElementById("btnAddInvite").addEventListener("click",async()=>{const e=document.getElementById("inviteEmailInput").value;await rl(e),document.getElementById("inviteEmailInput").value=""});document.getElementById("btnSaveRequireInvite").addEventListener("click",yg);document.getElementById("btnSaveSeatLimit")?.addEventListener("click",hg);window.__BC_MB__=window.__BC_MB__||{};window.__BC_MB__.wireManagerBoardMenu=wn;window.__BC_MB__.applyManagerBoardVisibility=Lr;window.__BC_MB__.loadManagerInsights=kr;window.__BC_MB__.loadManagerBoardData=ae;window.__BC_MB__.loadManagerMessenger=Be;window.__BC_MB__.wireManagerBoardMessenger=vr;window.wireManagerBoardMenu=wn;window.applyManagerBoardVisibility=Lr;window.loadManagerInsights=kr;window.loadManagerBoardData=ae;window.loadManagerMessenger=Be;(function(){if(window.__BC_BOOTED__){console.warn("[BOOT] blocked duplicate boot");return}window.__BC_BOOTED__=!0,console.log("[BOOT] first boot ✅")})();const Eg=new URLSearchParams(location.search).get("loggedOut")==="1";window.__BC_SKIP_DECIDE_ROUTE__=!1;try{const e=new URL(window.location.href);e.searchParams.delete("mode"),e.searchParams.delete("demo"),e.searchParams.delete("logout"),history.replaceState({},"",e.pathname)}catch{}(function(){const t=document.getElementById("premiumRoot");if(!t)return;new MutationObserver(()=>{if(!_?.session){const r=!!document.getElementById("premiumRootFrame"),a=t.innerHTML.trim().length>0;if(r||a){console.error("[GHOST] premiumRoot changed while logged out. Something is remounting it."),t.innerHTML="";try{document.getElementById("premiumRootFrame")?.remove()}catch{}}}}).observe(t,{childList:!0,subtree:!0})})();let qt=!1;if(Eg){console.warn("[BOOT] loggedOut latch: forcing auth screen, skipping routing");try{_.session=null,_.profile=null}catch{}try{we("boot.loggedOut")}catch{}try{gt("boot.loggedOut")}catch{}try{const e=new URL(location.href);e.searchParams.delete("loggedOut"),e.searchParams.delete("mode"),e.searchParams.delete("demo"),history.replaceState({},"",e.pathname)}catch{}try{Ln()}catch{}window.__BC_SKIP_DECIDE_ROUTE__=!0,qt=!0}try{if(localStorage.getItem("__BC_LOGOUT_LATCH__")){console.warn("[BOOT] logout latch active -> forcing logged-out UI"),localStorage.removeItem("__BC_LOGOUT_LATCH__");try{_.session=null}catch{}try{_.profile=null}catch{}try{document.getElementById("premiumRoot")&&(document.getElementById("premiumRoot").innerHTML="")}catch{}try{document.getElementById("premiumRootFrame")?.remove()}catch{}try{document.getElementById("btnLogout")&&(document.getElementById("btnLogout").style.display="none")}catch{}try{K("screenHome")}catch{}qt=!0,setTimeout(()=>{qt=!1},1e3)}}catch{}if(!window.__BC_TRACE_TRAPS__){let e=function(t,n={}){console.log(t,n),console.log(new Error("[TRACE]").stack)};if(window.__BC_TRACE_TRAPS__=!0,window.mountPremiumGameIframe=Wt,window.routePremium=Fr,window.showScreen=K,window.setHomeAuthUI=fn,window.routeDemoShellNoAuth=ig,typeof window.mountPremiumGameIframe=="function"){const t=window.mountPremiumGameIframe;window.mountPremiumGameIframe=function(...n){return e("[TRAP] mountPremiumGameIframe()",{hasSession:!!_?.session,args:n}),t.apply(this,n)}}if(typeof window.routePremium=="function"){const t=window.routePremium;window.routePremium=async function(...n){return e("[TRAP] routePremium()",{hasSession:!!_?.session,args:n}),t.apply(this,n)}}if(typeof window.showScreen=="function"){const t=window.showScreen;window.showScreen=function(...n){return e("[TRAP] showScreen()",{args:n}),t.apply(this,n)}}if(typeof window.setHomeAuthUI=="function"){const t=window.setHomeAuthUI;window.setHomeAuthUI=function(n,...r){return e("[TRAP] setHomeAuthUI()",{isLoggedIn:n,hasSession:!!_?.session}),t.call(this,n,...r)}}if(typeof window.routeDemoShellNoAuth=="function"){const t=window.routeDemoShellNoAuth;window.routeDemoShellNoAuth=function(...n){return e("[TRAP] routeDemoShellNoAuth()",{args:n,url:location.href}),t.apply(this,n)}}}K("screenHome");Ur("single_manager");Hr("15");It("waiter");Mt("login");Ge("login");vg();Sg();al();On();Va();new Date().toISOString();(async function(){const{data:t}=await I.auth.getSession();console.log("[BOOT PROOF] supabase",I.__BC_ID__,"session?",!!t?.session)})();async function sl(){const{data:e}=await I.auth.getSession();if(!(e?.session||null)){console.log("[ROUTE] no session -> forcing public mode"),Te="public",window.__BC_FORCE_AUTH__=!1;try{Mt("login")}catch{}try{Ge("login")}catch{}K("screenHome");return}console.log("[ROUTE] session present -> allow premium flow")}I.auth.onAuthStateChange((e,t)=>{if(new Date().toISOString(),console.log("[AUTH EVENT]",e),console.log("[AUTH] state change:",e,!!t),qt){console.warn("[AUTH] blocked by boot logout latch",e);return}if(xt()){console.warn("[AUTH] listener blocked (logging out)",e);return}la&&clearTimeout(la),la=setTimeout(async()=>{try{if(_.session=t||null,!t){console.log("[AUTH] session gone -> forcing login screen"),_.profile=null,_.restaurant=null,_.activeRestaurantId=null,Te="public";try{document.querySelectorAll("iframe").forEach(n=>n.remove())}catch{}K("screenHome"),ja(),Nd(),document.querySelectorAll("#btnHomeLogout, #btnLogoutCreate, #btnLogoutPremium, #btnLogoutManagerBoard").forEach(n=>{n.classList.add("hidden"),n.disabled=!1}),On();return}await cg("auth_subscriber"),await Va()}catch{le(),K("screenHome")}},150)});(async function(){try{if(qt||window.__BC_SKIP_DECIDE_ROUTE__)return;await Ct("boot.resume"),gr(),await sl()}catch{}})();qt||sl();window.addEventListener("message",e=>{e?.data?.source==="BC_MSG"&&console.log("[PARENT] got BC_MSG:",e.data,"origin:",e.origin)});export{Nn as g,Cs as n};
