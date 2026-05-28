!macro DECLUTTER_STOP_DELETE_SERVICE
  nsExec::ExecToLog 'sc.exe stop DeclutterService'
  Sleep 1500
  nsExec::ExecToLog 'sc.exe delete DeclutterService'
  Sleep 1500
!macroend

!macro NSIS_HOOK_PREINSTALL
  !insertmacro DECLUTTER_STOP_DELETE_SERVICE
  Delete "$INSTDIR\declutter-service.exe"
!macroend

!macro NSIS_HOOK_POSTINSTALL
  nsExec::ExecToLog 'sc.exe create DeclutterService binPath= "$INSTDIR\declutter-service.exe" start= auto DisplayName= "Declutter Service"'
  nsExec::ExecToLog 'sc.exe description DeclutterService "Declutter lock enforcement service"'
  nsExec::ExecToLog 'sc.exe start DeclutterService'
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  !insertmacro DECLUTTER_STOP_DELETE_SERVICE
!macroend
