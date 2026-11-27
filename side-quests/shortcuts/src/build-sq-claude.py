# Side Quests "SQ Claude" (25.89, Oren 27.11.2026): opens the text it gets (a claude.ai link) with "Open URLs".
# Opened from Shortcuts, a claude.ai link goes to the Claude app (with voice mode) instead of a browser tab.
# The app calls it as shortcuts://run-shortcut?name=SQ%20Claude&input=text&text=<link>. No PIN, no network calls.
import plistlib, uuid, sys
U=lambda: str(uuid.uuid4()).upper()
IN={"Type":"ExtensionInput"}
def tok(a): return {"Value":a,"WFSerializationType":"WFTextTokenAttachment"}
def txt(*parts):
    s="";ab={}
    for p in parts:
        if isinstance(p,str): s+=p
        else: ab["{%d, 1}"%len(s)]=p; s+="￼"
    v={"string":s}
    if ab: v["attachmentsByRange"]=ab
    return {"Value":v,"WFSerializationType":"WFTextTokenString"}
t,u=U(),U()
A=[{"WFWorkflowActionIdentifier":"is.workflow.actions.gettext","WFWorkflowActionParameters":{"UUID":t,"WFTextActionText":txt(IN)}},
   {"WFWorkflowActionIdentifier":"is.workflow.actions.url","WFWorkflowActionParameters":{"UUID":u,"WFURLActionURL":txt({"Type":"ActionOutput","OutputUUID":t,"OutputName":"Text"})}},
   {"WFWorkflowActionIdentifier":"is.workflow.actions.openurl","WFWorkflowActionParameters":{"WFInput":tok({"Type":"ActionOutput","OutputUUID":u,"OutputName":"URL"}),"Show-WFInput":True}}]
wf={"WFWorkflowClientVersion":"2607.0.2","WFWorkflowMinimumClientVersion":900,"WFWorkflowMinimumClientVersionString":"900",
 "WFWorkflowIcon":{"WFWorkflowIconStartColor":4251333119,"WFWorkflowIconGlyphNumber":59818},
 "WFWorkflowTypes":[],"WFWorkflowHasShortcutInputVariables":True,
 "WFWorkflowInputContentItemClasses":["WFStringContentItem","WFURLContentItem"],
 "WFWorkflowImportQuestions":[],"WFWorkflowActions":A,"WFQuickActionSurfaces":[],"WFWorkflowHasOutputFallback":False,"WFWorkflowOutputContentItemClasses":[]}
plistlib.dump(wf,open(sys.argv[1],"wb"),fmt=plistlib.FMT_BINARY)
print(len(A),"actions")
