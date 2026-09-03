<?php
 include('classes/configure.php');
if(isset($_REQUEST['submit'])){
        
        if($_POST['extent'] == ''){
            $extent = '';
        }else{
            $extent = implode(", ", $_POST['extent']);
        }
        
        if($_POST['visual_insp'] == ''){
            $visual_insp = '';
        }else{
            $visual_insp = implode(", ", $_POST['visual_insp']);
        }
        
        if($_POST['polarity'] == ''){
            $polarity = '';
        }else{
            $polarity = implode(", ", $_POST['polarity']);
        }
        
        if($_POST['earth'] == ''){
            $earth = '';
        }else{
            $earth = implode(", ", $_POST['earth']);
        }
        
        $arr = array( "address"=>$_REQUEST['address'],"d_p_check"=>$_REQUEST['d_p_check'],"extent"=>$extent,"visual_insp"=>$visual_insp,"polarity"=>$polarity,"earth"=>$earth,"push"=>$_REQUEST['push'],"time"=>$_REQUEST['time'],"push1"=>$_REQUEST['push1'],"time1"=>$_REQUEST['time1'],"push2"=>$_REQUEST['push2'],"time2"=>$_REQUEST['time2'],"push3"=>$_REQUEST['push3'],"time3"=>$_REQUEST['time3'],"push4"=>$_REQUEST['push4'],"time4"=>$_REQUEST['time4'],"push5"=>$_REQUEST['push5'],"time5"=>$_REQUEST['time5'],"extra1"=>$_REQUEST['extra1'],"push6"=>$_REQUEST['push6'],"time6"=>$_REQUEST['time6'],"extra2"=>$_REQUEST['extra2'],"push7"=>$_REQUEST['push7'],"time7"=>$_REQUEST['time7'],"extra3"=>$_REQUEST['extra3'],"push8"=>$_REQUEST['push8'],"time8"=>$_REQUEST['time8'],"extra4"=>$_REQUEST['extra4'],"push9"=>$_REQUEST['push9'],"time9"=>$_REQUEST['time9'],"smoke"=>$_REQUEST['smoke'],"smoke_due_by"=>$_REQUEST['smoke_due_by'],"observation_recomm"=>$_REQUEST['observation_recomm'],"ele_saf_check"=>$_REQUEST['ele_saf_check'],"lic_reg_number"=>$_REQUEST['lic_reg_number'],"inspe_date"=>$_REQUEST['inspe_date'],"next_inspe_due_date"=>$_REQUEST['next_inspe_due_date'],"signature"=>$_REQUEST['signature'],"final_date"=>$_REQUEST['final_date']);
  	    $insert=insertqry($arr, 'safety');
  	    header('Location: '.URL_BASE.'electric-safety-check.php?msg=suc');
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Electrical Safety Check – Report</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

<style>
body {
  background: #eee;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 13px;
}

.page {
  width: 210mm;
  min-height: 297mm;
  background: #fff;
  margin: 10mm auto;
  padding: 10mm;
}

.heading{color:#365F91;font-weight:bold;}

/*.section-title {*/
/*  font-weight: bold;*/
/*  margin-top: 20px;*/
/*  border-bottom: 1px solid #000;*/
/*  padding-bottom: 4px;*/
/*}*/
.section-title {
      background: #e9ecef;
      padding: 10px;
      margin-top: 30px;
      font-weight: 600;
    }

.table td, .table th {
  border: 1px solid #000;
  padding: 6px;
}
.form-control {border: 1px solid black;}
.form-check-input {border: 1px solid black;}
.form-select {border: 1px solid black;}
@media print {
  body { background: none; }
  .page { margin: 0; }
}
</style>
</head>

<body>
    
    
    <p>&nbsp;</p>
    <?php if($_REQUEST['msg'] == 'suc'){ ?>    
    <h3 style="text-align: center;margin-top: 10px;"><span style="color:#00af65;">Form Submitted Successfully.</span> </h3>
    <?php } ?>
    
    <?php if($_REQUEST['msg'] == 'fail'){ ?>    
        <h3 style="text-align: center;margin-top: 10px;"><span style="color:red;">Something is wrong. Please try again.</span> </h3>
    <?php } ?>  
    <br/>     

<div class="page">
<form method="post" class="needs-validation" novalidate>

<p class="text-center mb-4 heading">Residential Tenancies Regulations 2021</p>
<h4 class="text-center heading">Electrical Safety Check – Report</h4>
<p class="mb-4">This electrical safety check is for electrical safety purposes only and is in accordance with the requirements of the Residential Tenancies 
Regulations 2021 and is prepared in accordance with section 2 of the Australian/New Zealand Standard AS/NZS 3019, Electrical installations—
Periodic verification to confirm that the installation is not damaged or has not deteriorated so as to impair electrical safety; and to identify 
installation defects and departures from the requirements that may give rise to danger. </p>

<!-- A. INSTALLATION ADDRESS -->
<div class="section-title">A. INSTALLATION ADDRESS</div>

<div class="row mt-2">
  <div class="col-md-8">
    <label class="form-label">Address *</label>
    <input type="text" class="form-control" name="address" id="address" placeholder="Address" required>
    <div class="invalid-feedback">Address is required.</div>
  </div>
  <div class="col-md-4">
    <label class="form-label">Date of previous Safety Check: (if any)</label>
    <input type="date" name="d_p_check" id="d_p_check" class="form-control">
  </div>
</div>


<!-- B. VISUAL INSPECTION -->
<div class="section-title">B. EXTENT OF THE INSTALLATION AND LIMITATIONS OF THE INSPECTION AND TESTING</div>
<p class="mb-4">Details of those parts of the installation and limitations of the safety check covered by this certificate Tick those parts of the installation included 
in the safety check –  strike out those parts of the installation if not applicable – mark NI if not included in the safety check – add additional 
information if required. </p>
<div class="row mt-2">
  <div class="col-md-5">
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="extent[]" value="Main switchboard">
      <label class="form-check-label">Main switchboard</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="extent[]" value="Main earthing system">
      <label class="form-check-label">Main earthing system</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="extent[]" value="Kitchen">
      <label class="form-check-label">Kitchen</label>
    </div>
    
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="extent[]" value="Bathroom (main)">
      <label class="form-check-label">Bathroom (main)</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="extent[]" value="Other bathrooms/ensuites">
      <label class="form-check-label">Other bathrooms/ensuites</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="extent[]" value="Bedroom (main)">
      <label class="form-check-label">Bedroom (main)</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="extent[]" value="Other bedrooms">
      <label class="form-check-label">Other bedrooms</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="extent[]" value="Living room">
      <label class="form-check-label">Living room</label>
    </div>
    
  </div>

  <div class="col-md-5">
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="extent[]" value="Other living areas">
      <label class="form-check-label">Other living areas</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="extent[]" value="Laundry">
      <label class="form-check-label">Laundry</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="extent[]" value="Garage">
      <label class="form-check-label">Garage</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="extent[]" value="Solar/battery system">
      <label class="form-check-label">Solar/battery system</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="extent[]" value="Electric water heater">
      <label class="form-check-label">Electric water heater</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="extent[]" value="Dishwasher">
      <label class="form-check-label">Dishwasher</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="extent[]" value="Electric room/space heaters">
      <label class="form-check-label">Electric room/space heaters</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="extent[]" value="Swimming pool equipment">
      <label class="form-check-label">Swimming pool equipment</label>
    </div>
  </div>

  <div class="invalid-feedback d-block" id="inspectionError" style="display:none">
    At least one visual inspection item must be selected.
  </div>
</div>

<!-- C. VISUAL INSPECTION -->
<div class="section-title">C. SAFETY CHECK – VISUAL INSPECTION</div>
<p class="mb-4">As far as practicable a VISUAL INSPECTION of the following items has been carried out per the requirements of <b> section 3 and 4 of the 
Australian/New Zealand Standard AS/NZS 3019:2007 Electrical installations—Periodic Verification: </b> strike out those parts of the installation if 
not applicable – mark NI if not included in the safety check – add additional information if required. </p>
<div class="row mt-2">
  <div class="col-md-5">
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="visual_insp[]" value="Consumers mains">
      <label class="form-check-label">Consumers mains</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="visual_insp[]" value="Switchboards">
      <label class="form-check-label">Switchboards</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="visual_insp[]" value="Exposed earth electrode">
      <label class="form-check-label">Exposed earth electrode</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="visual_insp[]" value="Metallic water pipe bond">
      <label class="form-check-label">Metallic water pipe bond </label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="visual_insp[]" value="RCDs (Safety switches)">
      <label class="form-check-label">RCDs (Safety switches) </label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="visual_insp[]" value="Circuit protection (circuit breakers / fuses)">
      <label class="form-check-label">Circuit protection (circuit breakers / fuses)</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="visual_insp[]" value="Socket-outlets">
      <label class="form-check-label">Socket-outlets </label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="visual_insp[]" value="Light fittings">
      <label class="form-check-label">Light fittings</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="visual_insp[]" value="Electric water heater">
      <label class="form-check-label">Electric water heater</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="visual_insp[]" value="Air conditioners">
      <label class="form-check-label">Air conditioners</label>
    </div>
  </div>

  <div class="col-md-5">
      
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="visual_insp[]" value="Space heaters">
      <label class="form-check-label">Space heaters</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="visual_insp[]" value="Cooking equipment">
      <label class="form-check-label">Cooking equipment</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="visual_insp[]" value="Dishwasher">
      <label class="form-check-label">Dishwasher</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="visual_insp[]" value="Exhaust fans">
      <label class="form-check-label">Exhaust fans</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="visual_insp[]" value="Celling fans">
      <label class="form-check-label">Celling fans</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="visual_insp[]" value="Washing machine/dryer">
      <label class="form-check-label">Washing machine/dryer</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="visual_insp[]" value="Installation wiring">
      <label class="form-check-label">Installation wiring</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="visual_insp[]" value="Solar and other renewable systems">
      <label class="form-check-label">Solar and other renewable systems</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="visual_insp[]" value="Swimming pool equipment">
      <label class="form-check-label">Swimming pool equipment </label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="visual_insp[]" value="Vehicle  chargers">
      <label class="form-check-label">Vehicle  chargers</label>
    </div>
  </div>

  <div class="invalid-feedback d-block" id="inspectionError" style="display:none">
    At least one visual inspection item must be selected.
  </div>
</div>



<!-- D. SAFETY CHECK -->
<div class="section-title">D. SAFETY CHECK - VERIFIED BY TESTING</div>
<p class="mb-4">As far as practicable TESTING of the following items has been carried out per the requirements of <b> 4 of the Australian/New Zealand Standard 
AS/NZS 3019:2007 Electrical installations—Periodic Verification: </b> strike out those parts of the installation if not applicable – mark NI if not 
included in the safety check – add additional information if required.</p>
<div class="section-title">Polarity and correct connections testing </div>
<div class="row mt-2">
  <div class="col-md-5">
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="polarity[]" value="Consumers mains">
      <label class="form-check-label">Consumers mains</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="polarity[]" value="Circuit protection (circuit breakers / fuses)">
      <label class="form-check-label">Circuit protection (circuit breakers / fuses)</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="polarity[]" value="RCDs (Safety switches)">
      <label class="form-check-label">RCDs (Safety switches) </label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="polarity[]" value="Socket-outlets">
      <label class="form-check-label">Socket-outlets </label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="polarity[]" value="Light fittings">
      <label class="form-check-label">Light fittings</label>
    </div>
  </div>

  <div class="col-md-5">
      
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="polarity[]" value="Electric water heater">
      <label class="form-check-label">Electric water heater</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="polarity[]" value="Air conditioners">
      <label class="form-check-label">Air conditioners </label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="polarity[]" value="Cooking equipment">
      <label class="form-check-label">Cooking equipment</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="polarity[]" value="Dishwasher">
      <label class="form-check-label">Dishwasher</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="polarity[]" value="Solar and other renewable systems">
      <label class="form-check-label">Solar and other renewable systems</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="polarity[]" value="Swimming pool equipment">
      <label class="form-check-label">Swimming pool equipment</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="polarity[]" value="Vehicle chargers">
      <label class="form-check-label">Vehicle chargers</label>
    </div>
  </div> 
</div>
<div class="invalid-feedback d-block" id="inspectionError" style="display:none">
    At least one visual inspection item must be selected.
</div>
    
    
<div class="section-title">Earth continuity testing </div>
<div class="row mt-2">
  <div class="col-md-5">
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="earth[]" value="Mains earth conductor">
      <label class="form-check-label">Mains earth conductor</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="earth[]" value="Switchboards enclosure">
      <label class="form-check-label">Switchboards enclosure</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="earth[]" value="Metallic water pipe bond">
      <label class="form-check-label">Metallic water pipe bond </label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="earth[]" value="Socket-outlets">
      <label class="form-check-label">Socket-outlets </label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="earth[]" value="Light fittings">
      <label class="form-check-label">Light fittings</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="earth[]" value="Exhaust fans">
      <label class="form-check-label">Exhaust fans </label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="earth[]" value="Celling fans">
      <label class="form-check-label">Celling fans</label>
    </div>
  </div>

  <div class="col-md-5">
      
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="earth[]" value="Electric water heater">
      <label class="form-check-label">Electric water heater</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="earth[]" value="Air conditioners">
      <label class="form-check-label">Air conditioners </label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="earth[]" value="Cooking equipment">
      <label class="form-check-label">Cooking equipment</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="earth[]" value="Dishwasher">
      <label class="form-check-label">Dishwasher</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="earth[]" value="Solar and other renewable systems">
      <label class="form-check-label">Solar and other renewable systems</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="earth[]" value="Swimming pool equipment">
      <label class="form-check-label">Swimming pool equipment</label>
    </div>
    <div class="form-check">
      <input class="form-check-input inspection-check" type="checkbox" name="earth[]" value="Vehicle chargers">
      <label class="form-check-label">Vehicle chargers</label>
    </div>
    
  </div>
</div>
  <div class="invalid-feedback d-block" id="inspectionError" style="display:none">
    At least one visual inspection item must be selected.
  </div>


<!-- D. TESTING -->
<div class="section-title">D.SAFETY CHECK - VERIFIED BY TESTING - Continued</div>
<p class="mb-4">RCD (residual-current device /safety switch) testing</p>

<table class="table table-sm mt-2">
<thead>
<tr>
  <th>Circuit protected </th>
  <th>Push button test (pass / fail)</th>
  <th>Time test (pass / fail) </th>
</tr>
</thead>
<tbody>
<tr>
  <td>Power outlets</td>
  <td>
    <select class="form-select form-select-sm" name="push" required>
      <option value="">Select</option>
      <option>Pass</option>
      <option>Fail</option>
      <option>NA</option>
    </select>
  </td>
  <td>
    <select class="form-select form-select-sm" name="time" required>
      <option value="">Select</option>
      <option>Pass</option>
      <option>Fail</option>
      <option>NA</option>
    </select>
  </td>
</tr>


<tr>
  <td>Power outlets</td>
  <td>
    <select class="form-select form-select-sm" name="push1" required>
      <option value="">Select</option>
      <option>Pass</option>
      <option>Fail</option>
      <option>NA</option>
    </select>
  </td>
  <td>
    <select class="form-select form-select-sm" name="time1" required>
      <option value="">Select</option>
      <option>Pass</option>
      <option>Fail</option>
      <option>NA</option>
    </select>
</tr>


<tr>
  <td>Power outlets</td>
  <td>
    <select class="form-select form-select-sm" name="push2" required>
      <option value="">Select</option>
      <option>Pass</option>
      <option>Fail</option>
      <option>NA</option>
    </select>
  </td>
  <td>
    <select class="form-select form-select-sm" name="time2" required>
      <option value="">Select</option>
      <option>Pass</option>
      <option>Fail</option>
      <option>NA</option>
    </select>
  </td>
</tr>


<tr>
  <td>Lighting</td>
  <td>
    <select class="form-select form-select-sm" name="push3" required>
      <option value="">Select</option>
      <option>Pass</option>
      <option>Fail</option>
      <option>NA</option>
    </select>
  </td>
  <td>
    <select class="form-select form-select-sm" name="time3" required>
      <option value="">Select</option>
      <option>Pass</option>
      <option>Fail</option>
      <option>NA</option>
    </select>
  </td>
</tr>


<tr>
  <td>Lighting</td>
  <td>
    <select class="form-select form-select-sm" name="push4" required>
      <option value="">Select</option>
      <option>Pass</option>
      <option>Fail</option>
      <option>NA</option>
    </select>
  </td>
  <td>
    <select class="form-select form-select-sm" name="time4" required>
      <option value="">Select</option>
      <option>Pass</option>
      <option>Fail</option>
      <option>NA</option>
    </select>  
  </td>
</tr>


<tr>
  <td>Other</td>
  <td>
    <select class="form-select form-select-sm" name="push5" required>
      <option value="">Select</option>
      <option>Pass</option>
      <option>Fail</option>
      <option>NA</option>
    </select>
  </td>
  <td>
    <select class="form-select form-select-sm" name="time5" required>
      <option value="">Select</option>
      <option>Pass</option>
      <option>Fail</option>
      <option>NA</option>
    </select>
  </td>
</tr>

<!----------- Added Extra field ------------------->
<tr>
  <td><input type="text" name="extra1" id="extra1" class="form-control"></td>
  <td>
    <select class="form-select form-select-sm" name="push6">
      <option value="">Select</option>
      <option>Pass</option>
      <option>Fail</option>
      <option>NA</option>
    </select>
  </td>
  <td>
    <select class="form-select form-select-sm" name="time6">
      <option value="">Select</option>
      <option>Pass</option>
      <option>Fail</option>
      <option>NA</option>
    </select>
  </td>
</tr>


<tr>
  <td><input type="text" name="extra2" id="extra2" class="form-control"></td>
  <td>
    <select class="form-select form-select-sm" name="push7">
      <option value="">Select</option>
      <option>Pass</option>
      <option>Fail</option>
      <option>NA</option>
    </select>
  </td>
  <td>
    <select class="form-select form-select-sm" name="time7">
      <option value="">Select</option>
      <option>Pass</option>
      <option>Fail</option>
      <option>NA</option>
    </select>
  </td>
</tr>

<tr>
  <td><input type="text" name="extra3" id="extra3" class="form-control"></td>
  <td>
    <select class="form-select form-select-sm" name="push8">
      <option value="">Select</option>
      <option>Pass</option>
      <option>Fail</option>
      <option>NA</option>
    </select>
  </td>
  <td>
    <select class="form-select form-select-sm" name="time8">
      <option value="">Select</option>
      <option>Pass</option>
      <option>Fail</option>
      <option>NA</option>
    </select>
  </td>
</tr>

<tr>
  <td><input type="text" name="extra4" id="extra4" class="form-control"></td>
  <td>
    <select class="form-select form-select-sm" name="push9">
      <option value="">Select</option>
      <option>Pass</option>
      <option>Fail</option>
      <option>NA</option>
    </select>
  </td>
  <td>
    <select class="form-select form-select-sm" name="time9">
      <option value="">Select</option>
      <option>Pass</option>
      <option>Fail</option>
      <option>NA</option>
    </select>
  </td>
</tr>
<!----------- End Extra field ------------------->

</tbody>
</table>

<!-- E. SMOKE ALARMS -->
<div class="section-title">E. SMOKE ALARMS</div>

<div class="row mt-2">
  <div class="col-md-6">
    <label class="form-label">All smoke alarm are correctly installed and in working condition; and have been tested according to the manufacturer's instructions. </label><br>
    <div class="form-check form-check-inline">
      <input class="form-check-input" type="radio" name="smoke" value="Yes" required>
      <label class="form-check-label">Yes</label>
    </div>
    <div class="form-check form-check-inline">
      <input class="form-check-input" type="radio" name="smoke" value="No" required>
      <label class="form-check-label">No</label>
    </div>
    <div class="invalid-feedback">Please select an option.</div>
  </div>

  <div class="col-md-6">
    <label class="form-label">Next smoke alarms check is due by:</label>
    <input type="date" class="form-control" name="smoke_due_by" required>
    <div class="invalid-feedback">Date required.</div>
    <p class="mb-4">All smoke alarms must be tested according to the 
manufacturer's instructions at least once every 12 months</p>
  </div>
  
</div>

<!-- F. OBSERVATIONS -->
<div class="section-title">F.OBSERVATIONS AND RECOMMENDATIONS FOR ANY ACTIONS TO BE TAKEN</div>
<p class="mb-4">The following observations and recommendations are made: </p>
<textarea class="form-control mt-2" rows="4" name="observation_recomm"></textarea>

<!-- CERTIFICATION -->
<div class="section-title">F.Electrical Safety Check Certification</div>

<div class="row mt-2">
  <div class="col-md-6">
    <label class="form-label">Electrical Safety check completed by:</label>
    <input type="text" class="form-control" name="ele_saf_check" required>
    <div class="invalid-feedback">Required.</div>
  </div>
  <div class="col-md-6">
    <label class="form-label">Licence/ registration number: </label>
    <input type="text" class="form-control" name="lic_reg_number" required>
    <div class="invalid-feedback">Required.</div>
  </div>
</div>

<div class="row mt-2">
  <div class="col-md-4">
    <label class="form-label">Inspection date: </label>
    <input type="date" class="form-control" name="inspe_date" required>
  </div>
  <div class="col-md-4">
    <label class="form-label">Next inspection due by: </label>
    <input type="date" class="form-control" name="next_inspe_due_date" required>
  </div>
  
  <p class="mb-4 mt-4">I the above named licenced electrician have carried out an <b>electrical safety check </b> of this residential tenancies per the 
requirements of the Residential Tenancies Regulations 2021 and set out in the Australian/New Zealand Standard 
AS/NZS 3019, "Electrical installations—Periodic verification, and have recorded my  observations and 
recommendations.</p>

</div>

<div class="row mt-2">

  <div class="col-md-6">
    <label class="form-label">Signature *</label>
    <input type="text" class="form-control" name="signature" required>
  </div>
  
  <div class="col-md-6">
    <label class="form-label"> Date: </label>
    <input type="date" class="form-control" name="final_date" required>
  </div>
  
 </div> 


<div class="text-center mt-4">
  <button class="btn btn-primary px-5" type="submit" name="submit">Submit</button>
</div>

</form>
</div>

<!-- VALIDATION SCRIPT -->
<script>
(() => {
  const form = document.querySelector('.needs-validation');
  const checks = document.querySelectorAll('.inspection-check');
  const inspectionError = document.getElementById('inspectionError');

  form.addEventListener('submit', e => {
    let checked = false;
    checks.forEach(c => { if (c.checked) checked = true; });

    if (!checked) {
      inspectionError.style.display = 'block';
      e.preventDefault();
      e.stopPropagation();
    } else {
      inspectionError.style.display = 'none';
    }

    if (!form.checkValidity()) {
      e.preventDefault();
      e.stopPropagation();
    }

    form.classList.add('was-validated');
  });
})();
</script>

</body>
</html>