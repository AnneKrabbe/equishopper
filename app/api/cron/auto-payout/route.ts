import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const supabaseAdmin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY!);
function authorized(req:NextRequest){const s=process.env.CRON_SECRET;if(!s)throw new Error("CRON_SECRET mangler.");return req.headers.get("authorization")===`Bearer ${s}`;}
async function payout(id:string){
 const {data:o,error}=await supabaseAdmin.rpc("prepare_order_auto_payout",{p_order_id:id}); if(error)throw new Error(error.message);
 if(o.payout_status==="paid"||o.stripe_transfer_id)return {id,result:"already_paid"};
 const amount=o.payout_net_amount; if(amount==null||amount<0)throw new Error("Ugyldigt payout_net_amount.");
 if(amount===0){const {error:e}=await supabaseAdmin.rpc("finalize_order_auto_without_transfer",{p_order_id:id});if(e)throw new Error(e.message);return{id,result:"completed_without_transfer"};}
 const t=await stripe.transfers.create({amount,currency:(o.currency||"dkk").toLowerCase(),destination:o.seller_stripe_account_id,source_transaction:o.stripe_charge_id,metadata:{order_id:id,payout_type:"automatic_delivery"}},{idempotencyKey:`equishopper-order-payout-${id}`});
 const {error:e}=await supabaseAdmin.rpc("finalize_order_auto_after_transfer",{p_order_id:id,p_transfer_id:t.id});if(e)throw new Error(e.message);
 return{id,result:"paid",transferId:t.id};
}
export async function GET(req:NextRequest){
 try{
  if(!authorized(req))return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  const {data,error}=await supabaseAdmin.from("orders").select("id").eq("payment_status","paid").not("shipping_delivered_at","is",null).not("payout_due_at","is",null).lte("payout_due_at",new Date().toISOString()).neq("payout_status","paid").order("payout_due_at",{ascending:true}).limit(25);
  if(error)throw new Error(error.message); const results=[];
  for(const x of data??[]){try{results.push(await payout(x.id));}catch(err){const m=err instanceof Error?err.message:"Ukendt fejl";await supabaseAdmin.from("orders").update({payout_error:m.slice(0,2000)}).eq("id",x.id);results.push({id:x.id,result:"error",error:m});}}
  return NextResponse.json({ok:true,checked:data?.length??0,results});
 }catch(err){return NextResponse.json({ok:false,error:err instanceof Error?err.message:"Ukendt fejl"},{status:500});}
}
