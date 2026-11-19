# "⚡ סייד קווסט" (Action Button), v2 19.11.2026 (Oren):
# - dictation stops only when you tap the screen (not on a pause)
# - "משימה מהירה ..." / "משימה קצרה ..." at the start = instant quick task (topics)
# - anything else = a voice instruction for All Arounder (instructions, status 'voice'),
#   handled by the hourly :17 run like a message in the All Arounder project.
# PIN = import question, never in the repo. Sign on Oren's PC via hubsign (see sq-share-shortcut memory).
import plistlib, uuid, sys
U=lambda: str(uuid.uuid4()).upper()
SUPA="https://emgtyfksnofzzlutngbf.supabase.co/rest/v1/rpc/sq_put"
ANON="sb_publishable_Pa6-CuUavcT0rpD8ei_cxA_8oZ-Ykku"
QUICK_FIND=r"^[\s‎‏]*(?:(?:תוסיף|הוסף|תוסיפי|להוסיף)\s+)?משימה\s+(?:מהירה|קצרה)[\s,.:\-]*"
def att(u,name): return {"Type":"ActionOutput","OutputUUID":u,"OutputName":name}
def tok(a): return {"Value":a,"WFSerializationType":"WFTextTokenAttachment"}
def txt(*parts):
    s="";ab={}
    for p in parts:
        if isinstance(p,str): s+=p
        else: ab["{%d, 1}"%len(s)]=p; s+="￼"
    v={"string":s}
    if ab: v["attachmentsByRange"]=ab
    return {"Value":v,"WFSerializationType":"WFTextTokenString"}
def item(k,v,t=0): return {"WFItemType":t,"WFKey":txt(k),"WFValue":v}
def dictv(items): return {"Value":{"WFDictionaryFieldValueItems":items},"WFSerializationType":"WFDictionaryFieldValue"}
A=[]
def act(i,p): A.append({"WFWorkflowActionIdentifier":i,"WFWorkflowActionParameters":p})
def var(a): return {"Type":"Variable","Variable":tok(a)}

pin,dic,dt,mt,ttl,did,did2,iso=[U() for _ in range(8)]
act("is.workflow.actions.gettext",{"UUID":pin,"WFTextActionText":""})          # 0: PIN (import question)
act("is.workflow.actions.dictatetext",{"UUID":dic,"WFSpeechLanguage":"he-IL","WFDictateTextStopListening":"On Tap"})
act("is.workflow.actions.gettext",{"UUID":dt,"WFTextActionText":txt(att(dic,"Dictated Text"))})
g0=U()
act("is.workflow.actions.conditional",{"GroupingIdentifier":g0,"WFControlFlowMode":0,"WFCondition":101,"WFInput":var(att(dt,"Text"))})
act("is.workflow.actions.exit",{})
act("is.workflow.actions.conditional",{"GroupingIdentifier":g0,"WFControlFlowMode":2})
act("is.workflow.actions.format.date",{"UUID":did,"WFDateFormatStyle":"Custom","WFDateFormat":"yyMMddHHmmss","WFDate":txt({"Type":"CurrentDate"})})
act("is.workflow.actions.format.date",{"UUID":did2,"WFDateFormatStyle":"Custom","WFDateFormat":"yyyyMMdd-HHmmss","WFDate":txt({"Type":"CurrentDate"})})
act("is.workflow.actions.format.date",{"UUID":iso,"WFDateFormatStyle":"ISO 8601","WFISO8601IncludeTime":True,"WFDate":txt({"Type":"CurrentDate"})})
act("is.workflow.actions.text.match",{"UUID":mt,"WFMatchTextPattern":QUICK_FIND,"WFMatchTextCaseSensitive":False,"text":txt(att(dt,"Text"))})

def post(coll,pid,data,ok_title,ok_body):
    res,rt,g=U(),U(),U()
    body=[item("p_key",txt(att(pin,"Text"))),item("p_app",txt("sidequests")),item("p_collection",txt(coll)),
          item("p_id",pid),
          {"WFItemType":1,"WFKey":txt("p_data"),"WFValue":{"Value":dictv(data),"WFSerializationType":"WFDictionaryFieldValue"}},
          {"WFItemType":4,"WFKey":txt("p_merge"),"WFValue":{"Value":False,"WFSerializationType":"WFNumberSubstitutableState"}}]
    hdr=[item("apikey",txt(ANON)),item("Authorization",txt("Bearer "+ANON)),item("Content-Type",txt("application/json"))]
    act("is.workflow.actions.downloadurl",{"UUID":res,"WFURL":SUPA,"WFHTTPMethod":"POST","ShowHeaders":True,"WFHTTPHeaders":dictv(hdr),"WFHTTPBodyType":"JSON","WFJSONValues":dictv(body)})
    act("is.workflow.actions.gettext",{"UUID":rt,"WFTextActionText":txt(att(res,"Contents of URL"))})
    act("is.workflow.actions.conditional",{"GroupingIdentifier":g,"WFControlFlowMode":0,"WFCondition":4,"WFConditionalActionString":"-1","WFInput":var(att(rt,"Text"))})
    act("is.workflow.actions.alert",{"WFAlertActionTitle":"הקוד לא נכון","WFAlertActionMessage":"לא נשמר. צריך להתקין שוב את קיצור הדרך עם הקוד של 6 הספרות.","WFAlertActionCancelButtonShown":False})
    act("is.workflow.actions.conditional",{"GroupingIdentifier":g,"WFControlFlowMode":1})
    act("is.workflow.actions.notification",{"WFNotificationActionTitle":ok_title,"WFNotificationActionBody":ok_body,"WFNotificationActionSound":False})
    act("is.workflow.actions.conditional",{"GroupingIdentifier":g,"WFControlFlowMode":2})

g1=U()
act("is.workflow.actions.conditional",{"GroupingIdentifier":g1,"WFControlFlowMode":0,"WFCondition":100,"WFInput":var(att(mt,"Matches"))})
# ⚡ quick task
act("is.workflow.actions.text.replace",{"UUID":ttl,"WFInput":txt(att(dt,"Text")),"WFReplaceTextFind":QUICK_FIND,"WFReplaceTextReplace":"","WFReplaceTextRegularExpression":True,"WFReplaceTextCaseSensitive":False})
T=txt(att(ttl,"Updated Text"))
post("topics",txt("t-sc",att(did,"Formatted Date")),
     [item("title",T),item("title_full",T),item("kind",txt("task")),item("size",txt("quick")),item("status",txt("active")),
      item("priority",txt("normal")),item("source",txt("נוסף ידנית בקיצור דרך")),
      item("created_at",txt(att(iso,"Formatted Date"))),item("updated_at",txt(att(iso,"Formatted Date")))],
     "⚡ נוספה משימה", T)
act("is.workflow.actions.conditional",{"GroupingIdentifier":g1,"WFControlFlowMode":1})
# 🧠 voice instruction to All Arounder
post("instructions",txt("v-",att(did2,"Formatted Date")),
     [item("kind",txt("voice")),item("via",txt("shortcut-voice")),item("status",txt("voice")),
      item("text",txt(att(dt,"Text"))),item("at",txt(att(iso,"Formatted Date")))],
     "🧠 נשמר ל-All Arounder", txt("יבוצע בריצה הקרובה (עד שעה): ",att(dt,"Text")))
act("is.workflow.actions.conditional",{"GroupingIdentifier":g1,"WFControlFlowMode":2})

wf={"WFWorkflowClientVersion":"2607.0.2","WFWorkflowMinimumClientVersion":900,"WFWorkflowMinimumClientVersionString":"900",
 "WFWorkflowIcon":{"WFWorkflowIconStartColor":4282601983,"WFWorkflowIconGlyphNumber":59773},
 "WFWorkflowTypes":[],"WFWorkflowHasShortcutInputVariables":False,"WFWorkflowInputContentItemClasses":[],
 "WFWorkflowImportQuestions":[{"ActionIndex":0,"Category":"Parameter","DefaultValue":"","ParameterKey":"WFTextActionText","Text":"הקוד של 6 הספרות של Side Quests (נשמר רק בטלפון)"}],
 "WFWorkflowActions":A,"WFQuickActionSurfaces":[],"WFWorkflowHasOutputFallback":False,"WFWorkflowOutputContentItemClasses":[]}
plistlib.dump(wf,open(sys.argv[1],"wb"),fmt=plistlib.FMT_BINARY)
print(len(A),"actions")
