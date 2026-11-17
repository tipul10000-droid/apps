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
pin,links,linkt,intext,note,did,iso,res,rtext,grp=[U() for _ in range(10)]
A=[]
def act(i,p): A.append({"WFWorkflowActionIdentifier":i,"WFWorkflowActionParameters":p})
# 0 PIN (import question)
act("is.workflow.actions.gettext",{"UUID":pin,"WFTextActionText":""})
act("is.workflow.actions.detect.link",{"UUID":links,"WFInput":tok(IN)})
act("is.workflow.actions.gettext",{"UUID":linkt,"WFTextActionText":txt(att(links,"URLs"))})
act("is.workflow.actions.gettext",{"UUID":intext,"WFTextActionText":txt(IN)})
act("is.workflow.actions.ask",{"UUID":note,"WFAskActionPrompt":"📥 משהו להוסיף? (רשות: לאן זה שייך, מה לעשות עם זה)","WFInputType":"Text","WFAskActionDefaultAnswer":"","WFAllowsMultilineText":True})
act("is.workflow.actions.format.date",{"UUID":did,"WFDateFormatStyle":"Custom","WFDateFormat":"yyyyMMdd-HHmmss","WFDate":txt({"Type":"CurrentDate"})})
act("is.workflow.actions.format.date",{"UUID":iso,"WFDateFormatStyle":"ISO 8601","WFISO8601IncludeTime":True,"WFDate":txt({"Type":"CurrentDate"})})
data=[item("kind",txt("share")),item("via",txt("share")),item("status",txt("pending")),
      item("url",txt(att(linkt,"Text"))),item("text",txt(att(intext,"Text"))),
      item("note",txt(att(note,"Provided Input"))),item("at",txt(att(iso,"Formatted Date")))]
body=[item("p_key",txt(att(pin,"Text"))),item("p_app",txt("sidequests")),item("p_collection",txt("instructions")),
      item("p_id",txt("sh-",att(did,"Formatted Date"))),
      {"WFItemType":1,"WFKey":txt("p_data"),"WFValue":{"Value":dictv(data),"WFSerializationType":"WFDictionaryFieldValue"}},
      {"WFItemType":4,"WFKey":txt("p_merge"),"WFValue":{"Value":False,"WFSerializationType":"WFNumberSubstitutableState"}}]
hdr=[item("apikey",txt(ANON)),item("Authorization",txt("Bearer "+ANON)),item("Content-Type",txt("application/json"))]
act("is.workflow.actions.downloadurl",{"UUID":res,"WFURL":SUPA,"WFHTTPMethod":"POST","ShowHeaders":True,"WFHTTPHeaders":dictv(hdr),"WFHTTPBodyType":"JSON","WFJSONValues":dictv(body)})
act("is.workflow.actions.gettext",{"UUID":rtext,"WFTextActionText":txt(att(res,"Contents of URL"))})
act("is.workflow.actions.conditional",{"GroupingIdentifier":grp,"WFControlFlowMode":0,"WFCondition":4,"WFConditionalActionString":"-1",
    "WFInput":{"Type":"Variable","Variable":tok(att(rtext,"Text"))}})
act("is.workflow.actions.alert",{"WFAlertActionTitle":"הקוד לא נכון","WFAlertActionMessage":"לא נשמר. צריך להתקין שוב את קיצור הדרך עם הקוד של 6 הספרות.","WFAlertActionCancelButtonShown":False})
act("is.workflow.actions.conditional",{"GroupingIdentifier":grp,"WFControlFlowMode":1})
act("is.workflow.actions.notification",{"WFNotificationActionTitle":"📥 נשמר ב-Side Quests","WFNotificationActionBody":"ייקרא ויתויק לדשבורד המתאים בריצה הקרובה (עד שעה)","WFNotificationActionSound":False})
act("is.workflow.actions.conditional",{"GroupingIdentifier":grp,"WFControlFlowMode":2})
wf={"WFWorkflowClientVersion":"2607.0.2","WFWorkflowMinimumClientVersion":900,"WFWorkflowMinimumClientVersionString":"900",
 "WFWorkflowIcon":{"WFWorkflowIconStartColor":4271458815,"WFWorkflowIconGlyphNumber":61440},
 "WFWorkflowTypes":["ActionExtension"],"WFWorkflowHasShortcutInputVariables":True,
 "WFWorkflowInputContentItemClasses":["WFURLContentItem","WFSafariWebPageContentItem","WFStringContentItem","WFRichTextContentItem","WFArticleContentItem"],
 "WFWorkflowNoInputBehavior":{"Name":"WFWorkflowNoInputBehaviorGetClipboard","Parameters":{}},
 "WFWorkflowImportQuestions":[{"ActionIndex":0,"Category":"Parameter","DefaultValue":"","ParameterKey":"WFTextActionText","Text":"הקוד של 6 הספרות של Side Quests (נשמר רק בטלפון)"}],
 "WFWorkflowActions":A,"WFQuickActionSurfaces":[],"WFWorkflowHasOutputFallback":False,"WFWorkflowOutputContentItemClasses":[]}
plistlib.dump(wf,open(sys.argv[1],"wb"),fmt=plistlib.FMT_BINARY)
print(len(A),"actions")
