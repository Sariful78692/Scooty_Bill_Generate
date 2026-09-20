let editingDropdownId = "";
const dropdownTypes = {"Company Name":"company", "Model":"model", "Bank Name":"bank", "Occupation":"occupation"};
function dropdownRows() { return window.dropdownDataList || []; }
function renderDropdownPage() { const body=document.getElementById('dropdownTableBody'); if(!body)return; body.innerHTML=dropdownRows().map(x=>`<tr><td>${x.Type}</td><td>${x.Value}</td><td><button class="btn-edit" onclick="editDropdown('${x.ID}')">Edit</button> <button class="btn-delete" onclick="deleteDropdown('${x.ID}')">Delete</button></td></tr>`).join('') || '<tr><td colspan="3">No data found</td></tr>'; }
async function dropdownPost(payload) { const r=await fetch(APPS_SCRIPT_URL,{method:'POST',body:JSON.stringify(payload)}); return r.json(); }
function dropdownToast(message, type='success') { if (window.showToast) showToast(message, type); else alert(message); }
window.saveDropdownValue=async function(){const type=document.getElementById('dropdownType').value,value=document.getElementById('dropdownValue').value.trim();if(!value)return dropdownToast('Value দিন','error');const wasEditing=Boolean(editingDropdownId);const r=await dropdownPost({action:wasEditing?'update_dropdown':'save_dropdown',id:editingDropdownId,type,value});if(r.status!=='success')return dropdownToast(r.message||'Save failed','error');editingDropdownId='';clearDropdownForm();await loadCustomers(true);renderDropdownPage();dropdownToast(wasEditing?'Updated successfully':'Added successfully');};
window.editDropdown=function(id){const x=dropdownRows().find(v=>v.ID===id);if(!x)return;editingDropdownId=id;document.getElementById('dropdownType').value=x.Type;document.getElementById('dropdownValue').value=x.Value;};
window.deleteDropdown=async function(id){if(!confirm('Delete this value?'))return;const r=await dropdownPost({action:'delete_dropdown',id});if(r.status==='success'){await loadCustomers(true);renderDropdownPage();dropdownToast('Deleted successfully');}else dropdownToast(r.message||'Delete failed','error');};
window.clearDropdownForm=function(){editingDropdownId='';document.getElementById('dropdownValue').value='';};
window.refreshDropdownOptions=function(){
  const map={"Company Name":['billCompany'],"Model":['billModel'],"Bank Name":['billBankSelect'],"Occupation":['occupationSelect']};
  Object.keys(map).forEach(type=>map[type].forEach(id=>{const s=document.getElementById(id);if(!s)return;const keep=s.value; s.querySelectorAll('option[data-db-dropdown]').forEach(o=>o.remove());dropdownRows().filter(x=>x.Type===type).forEach(x=>{const o=new Option(x.Value,x.Value);o.dataset.dbDropdown='1';s.add(o);});if(keep)s.value=keep;}));
  renderDropdownPage();
};
async function addCatalogValue(type, promptText, selectId){const value=prompt(promptText);if(!value||!value.trim())return;const clean=value.trim();const duplicate=dropdownRows().some(x=>x.Type.toLowerCase()===type.toLowerCase()&&x.Value.trim().toLowerCase()===clean.toLowerCase());if(duplicate)return dropdownToast('এই value আগে থেকেই আছে','error');const r=await dropdownPost({action:'save_dropdown',type,value:clean});if(r.status!=='success')return dropdownToast(r.message||'Save failed','error');await loadCustomers(true);const s=document.getElementById(selectId);if(s)s.value=clean;dropdownToast(type+' added successfully');}
window.promptAddNewCompany=()=>addCatalogValue('Company Name','Enter New Vehicle Company Name:','billCompany');
window.promptAddNewModel=()=>addCatalogValue('Model','Enter New Vehicle Model Name:','billModel');
window.promptAddNewOccupation=()=>addCatalogValue('Occupation','Enter new Occupation:','occupationSelect');
window.promptAddNewBank=()=>addCatalogValue('Bank Name','Enter New Bank Name:','billBankSelect');
function openEditPopup(title, current, onSave) {
  document.getElementById('catalog-edit-popup')?.remove();
  const modal=document.createElement('div'); modal.id='catalog-edit-popup'; modal.className='modal-overlay';
  modal.innerHTML=`<div class="modal-content" style="max-width:420px"><div class="modal-header"><h3>${title}</h3><span class="close-modal" id="catalogEditClose">&times;</span></div><div class="modal-body"><label>New Value</label><input id="catalogEditValue" value="${String(current).replace(/"/g,'&quot;')}" style="width:100%;padding:10px;margin-top:6px;border:1px solid #cbd5e1;border-radius:5px"></div><div class="modal-footer"><button class="btn-secondary" id="catalogEditCancel">Cancel</button><button class="btn-primary" id="catalogEditSave">Save</button></div></div>`;
  document.body.appendChild(modal); const close=()=>modal.remove(); modal.querySelector('#catalogEditClose').onclick=close; modal.querySelector('#catalogEditCancel').onclick=close; modal.querySelector('#catalogEditSave').onclick=async()=>{const v=modal.querySelector('#catalogEditValue').value.trim();if(!v)return dropdownToast('Value দিন','error');await onSave(v);close();}; modal.querySelector('#catalogEditValue').focus();
}
async function editCatalogSelected(type, selectId, label) {
  const select=document.getElementById(selectId), current=select && select.value;
  const row=dropdownRows().find(x=>x.Type===type && x.Value===current);
  if(!row) { if(!current) return dropdownToast('Please select a '+label+' first.','error'); const r=await dropdownPost({action:'save_dropdown',type,value:current}); if(r.status!=='success') return dropdownToast(r.message||'Could not import old value','error'); await loadCustomers(true); return editCatalogSelected(type,selectId,label); }
  openEditPopup('Edit '+label, current, async(value)=>{const r=await dropdownPost({action:'update_dropdown',id:row.ID,type,value});if(r.status!=='success')return dropdownToast(r.message||'Update failed','error');await loadCustomers(true);if(select)select.value=value;dropdownToast(label+' updated successfully');});
}
async function deleteCatalogSelected(type, selectId, label) {
  const select=document.getElementById(selectId), current=select && select.value;
  const row=dropdownRows().find(x=>x.Type===type && x.Value===current);
  if(!row) { if(!current) return dropdownToast('Please select a '+label+' first.','error'); if(type==='Company Name'||type==='Model') { const key=type==='Company Name'?'companies':'models'; const values=JSON.parse(localStorage.getItem('daduBillCatalog_'+key)||'[]').filter(v=>v!==current); localStorage.setItem('daduBillCatalog_'+key,JSON.stringify(values)); } select.querySelector(`option[value="${CSS.escape(current)}"]`)?.remove(); dropdownToast(label+' deleted successfully'); return; }
  if(!confirm('Delete '+label+' "'+current+'"?')) return;
  const r=await dropdownPost({action:'delete_dropdown',id:row.ID});
  if(r.status!=='success') return dropdownToast(r.message||'Delete failed','error'); await loadCustomers(true); if(select) select.value=''; dropdownToast(label+' deleted successfully');
}
window.editSelectedCompany=()=>editCatalogSelected('Company Name','billCompany','Company Name');
window.deleteSelectedCompany=()=>deleteCatalogSelected('Company Name','billCompany','Company Name');
window.editSelectedModel=()=>editCatalogSelected('Model','billModel','Model');
window.deleteSelectedModel=()=>deleteCatalogSelected('Model','billModel','Model');
window.editSelectedBank=()=>editCatalogSelected('Bank Name','billBankSelect','Bank Name');
window.deleteSelectedBank=()=>deleteCatalogSelected('Bank Name','billBankSelect','Bank Name');
window.editSelectedOccupation=()=>editCatalogSelected('Occupation','occupationSelect','Occupation');
window.deleteSelectedOccupation=()=>deleteCatalogSelected('Occupation','occupationSelect','Occupation');
document.addEventListener('DOMContentLoaded',()=>setTimeout(refreshDropdownOptions,100));
