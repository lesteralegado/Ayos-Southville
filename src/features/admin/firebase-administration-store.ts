import "server-only";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { AdministrationValidationError, createAdministrationModule, type AdministrationStore, type PilotConfiguration, type PilotUser } from "./administration-module";
import type { AuditEvent } from "@/features/reports/moderation-module";

function createFirebaseAdministrationStore(): AdministrationStore {
  const db=getFirebaseAdmin().db;
  return {
    async listUsers(){const snapshot=await db.collection("residentProfiles").get(); return snapshot.docs.map((doc)=>({uid:doc.id,roles:(doc.data().roles??["Resident"]) as PilotUser["roles"]}));},
    async saveUser(user,event){
      await db.runTransaction(async (transaction)=>{
        const targetRef=db.collection("residentProfiles").doc(user.uid);
        const target=await transaction.get(targetRef);
        const currentRoles=(target.data()?.roles??["Resident"]) as PilotUser["roles"];
        if(currentRoles.includes("Administrator")&&!user.roles.includes("Administrator")){
          const administrators=await transaction.get(db.collection("residentProfiles").where("roles","array-contains","Administrator"));
          if(administrators.docs.every((document)=>document.id===user.uid))throw new AdministrationValidationError("The pilot must retain at least one administrator.");
        }
        transaction.set(targetRef,{roles:user.roles},{merge:true});
        transaction.create(db.collection("auditEvents").doc(crypto.randomUUID()),event);
      });
    },
    async getConfiguration(){const doc=await db.collection("pilotConfiguration").doc("current").get(); return (doc.data()??{categories:[],destinations:[],emergency:{en:{message:"Call 911 for emergencies.",phone:"911",sourceUrl:"https://e911.gov.ph/"},fil:{message:"Tumawag sa 911 para sa emergency.",phone:"911",sourceUrl:"https://e911.gov.ph/"}}}) as PilotConfiguration;},
    async saveConfiguration(configuration,event){const batch=db.batch(); batch.set(db.collection("pilotConfiguration").doc("current"),configuration); batch.create(db.collection("auditEvents").doc(crypto.randomUUID()),event); await batch.commit();},
    async listAudit(){const snapshot=await db.collection("auditEvents").get(); return snapshot.docs.map((doc)=>doc.data() as AuditEvent);},
  };
}
export function getAdministrationModule(){return createAdministrationModule({store:createFirebaseAdministrationStore()});}
export async function getPublicPilotConfiguration(){return createFirebaseAdministrationStore().getConfiguration();}
