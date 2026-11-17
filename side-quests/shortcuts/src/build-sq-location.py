# Side Quests "סייד לוקיישן": where am I now. Text input (from an iOS Bluetooth automation: "driving" / "auto") is written as is; no input = menu.
import plistlib, uuid, sys
U=lambda: str(uuid.uuid4()).upper()
SUPA="https://emgtyfksnofzzlutngbf.supabase.co/rest/v1/rpc/sq_put"
ANON="sb_publishable_Pa6-CuUavcT0rpD8ei_cxA_8oZ-Ykku"
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
def item(k,v,t=0):
    return {"WFItemType":t,"WFKey":txt(k),"WFValue":v}
def dictv(items): return {"Value":{"WFDictionaryFieldValueItems":items},"WFSerializationType":"WFDictionaryFieldValue"}
IN={"Type":"ExtensionInput"}
pin,intext,g1,g2,g3,mn=[U() for _ in range(6)]
A=[]
def act(i,p): A.append({"WFWorkflowActionIdentifier":i,"WFWorkflowActionParameters":p})
# 0 PIN (import question)
act("is.workflow.actions.gettext",{"UUID":pin,"WFTextActionText":""})
act("is.workflow.actions.gettext",{"UUID":intext,"WFTextActionText":txt(IN)})
HASIN={"Type":"Variable","Variable":tok(IN)}
# input given (automation) -> w = input; otherwise ask
act("is.workflow.actions.conditional",{"GroupingIdentifier":g1,"WFControlFlowMode":0,"WFCondition":100,"WFInput":HASIN})
act("is.workflow.actions.setvariable",{"WFVariableName":"w","WFInput":txt(att(intext,"Text"))})
act("is.workflow.actions.conditional",{"GroupingIdentifier":g1,"WFControlFlowMode":1})
MENU=[("🚘 נוהג (רק שיחות)","driving"),("🏠 בבית","house"),("🚶 סמוך לבית","walk"),("🚗 בכפר סבא","out"),("💻 על המחשב","pc"),("✦ אוטומטי (לפי שעה ו-GPS)","auto")]
act("is.workflow.actions.choosefrommenu",{"GroupingIdentifier":mn,"WFControlFlowMode":0,"WFMenuPrompt":"📍 איפה אני עכשיו?","WFMenuItems":[m[0] for m in MENU]})
for lab,w in MENU:
    act("is.workflow.actions.choosefrommenu",{"GroupingIdentifier":mn,"WFControlFlowMode":1,"WFMenuItemTitle":lab})
    act("is.workflow.actions.setvariable",{"WFVariableName":"w","WFInput":txt(w)})
act("is.workflow.actions.choosefrommenu",{"GroupingIdentifier":mn,"WFControlFlowMode":2})
act("is.workflow.actions.conditional",{"GroupingIdentifier":g1,"WFControlFlowMode":2})
iso,res,rtext=U(),U(),U()
act("is.workflow.actions.format.date",{"UUID":iso,"WFDateFormatStyle":"ISO 8601","WFISO8601IncludeTime":True,"WFDate":txt({"Type":"CurrentDate"})})
VW={"Type":"Variable","VariableName":"w"}
data=[item("w",txt(VW)),item("at",txt(att(iso,"Formatted Date"))),item("via",txt("shortcut"))]
body=[item("p_key",txt(att(pin,"Text"))),item("p_app",txt("sidequests")),item("p_collection",txt("settings")),
      item("p_id",txt("where")),
      {"WFItemType":1,"WFKey":txt("p_data"),"WFValue":{"Value":dictv(data),"WFSerializationType":"WFDictionaryFieldValue"}},
      {"WFItemType":4,"WFKey":txt("p_merge"),"WFValue":{"Value":False,"WFSerializationType":"WFNumberSubstitutableState"}}]
hdr=[item("apikey",txt(ANON)),item("Authorization",txt("Bearer "+ANON)),item("Content-Type",txt("application/json"))]
act("is.workflow.actions.downloadurl",{"UUID":res,"WFURL":SUPA,"WFHTTPMethod":"POST","ShowHeaders":True,"WFHTTPHeaders":dictv(hdr),"WFHTTPBodyType":"JSON","WFJSONValues":dictv(body)})
act("is.workflow.actions.gettext",{"UUID":rtext,"WFTextActionText":txt(att(res,"Contents of URL"))})
act("is.workflow.actions.conditional",{"GroupingIdentifier":g2,"WFControlFlowMode":0,"WFCondition":4,"WFConditionalActionString":"-1",
    "WFInput":{"Type":"Variable","Variable":tok(att(rtext,"Text"))}})
act("is.workflow.actions.alert",{"WFAlertActionTitle":"הקוד לא נכון","WFAlertActionMessage":"לא נשמר. צריך להתקין שוב את קיצור הדרך עם הקוד של 6 הספרות.","WFAlertActionCancelButtonShown":False})
act("is.workflow.actions.conditional",{"GroupingIdentifier":g2,"WFControlFlowMode":1})
act("is.workflow.actions.conditional",{"GroupingIdentifier":g3,"WFControlFlowMode":0,"WFCondition":101,"WFInput":HASIN})
act("is.workflow.actions.notification",{"WFNotificationActionTitle":"📍 Side Quests עודכן","WFNotificationActionBody":"חלון הזמן מתעדכן בכל עותק פתוח של האפליקציה","WFNotificationActionSound":False})
act("is.workflow.actions.conditional",{"GroupingIdentifier":g3,"WFControlFlowMode":2})
act("is.workflow.actions.conditional",{"GroupingIdentifier":g2,"WFControlFlowMode":2})
wf={"WFWorkflowClientVersion":"2607.0.2","WFWorkflowMinimumClientVersion":900,"WFWorkflowMinimumClientVersionString":"900",
 "WFWorkflowIcon":{"WFWorkflowIconStartColor":4282601983,"WFWorkflowIconGlyphNumber":59818},
 "WFWorkflowTypes":[],"WFWorkflowHasShortcutInputVariables":True,
 "WFWorkflowInputContentItemClasses":["WFStringContentItem"],
 "WFWorkflowImportQuestions":[{"ActionIndex":0,"Category":"Parameter","DefaultValue":"","ParameterKey":"WFTextActionText","Text":"הקוד של 6 הספרות של Side Quests (נשמר רק בטלפון)"}],
 "WFWorkflowActions":A,"WFQuickActionSurfaces":[],"WFWorkflowHasOutputFallback":False,"WFWorkflowOutputContentItemClasses":[]}
plistlib.dump(wf,open(sys.argv[1],"wb"),fmt=plistlib.FMT_BINARY)
print(len(A),"actions")
