import juice from "juice";

const template = (otp: string) => `

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout:fixed;background-color:#f9f9f9" id="bodyTable">
	<tbody>
		<tr>
			<td style="padding-right:10px;padding-left:10px;" align="center" valign="top" id="bodyCell">
				<table border="0" cellpadding="0" cellspacing="0" width="100%" class="wrapperBody" style="max-width:600px">
					<tbody>
						<tr>
							<td align="center" valign="top">
								<table border="0" cellpadding="0" cellspacing="0" width="100%" class="tableCard" style="background-color:#fff;border-color:#e5e5e5;border-style:solid;border-width:0 1px 1px 1px;">
									<tbody>
										<tr>
											<td style="background-color:#7B63FE;font-size:1px;line-height:3px" class="topBorder" height="3">&nbsp;</td>
										</tr>
										<tr>
											<td style="padding-top: 60px; padding-bottom: 20px;" align="center" valign="middle" class="emailLogo">
												<p style="color:#7B63FE;font-size:24px;">Recovery Key</p>
											</td>
										</tr>
										<tr>
											<td style="padding-bottom: 5px; padding-left: 20px; padding-right: 20px;" align="center" valign="top" class="mainTitle">
												<h2 class="text" style="color:#000;font-family:Poppins,Helvetica,Arial,sans-serif;font-size:20px;font-weight:500;font-style:normal;letter-spacing:normal;line-height:36px;text-transform:none;text-align:center;padding:0;margin:0">Welcome to MOX Wallet</h2>
											</td>
										</tr>
										<tr>
											<td style="padding-left:20px;padding-right:20px" align="center" valign="top" class="containtTable ui-sortable">
												<table border="0" cellpadding="0" cellspacing="0" width="100%" class="tableDescription" style="">
													<tbody>
														<tr>
															<td style="padding-bottom: 20px;" align="center" valign="top" class="description">
																<p class="text" style="color:#666;font-family:'Open Sans',Helvetica,Arial,sans-serif;font-size:14px;font-weight:400;font-style:normal;letter-spacing:normal;line-height:22px;text-transform:none;text-align:center;padding:0;margin:0">To ensure the security of your account, we kindly request that you keep the highlighted below Recovery Key safe with you, his recovery key will be used to recover your Wallet or reset your Wallet password.</p>
                                                                
															</td>
														</tr>
													</tbody>
												</table>
												<table border="0" cellpadding="0" cellspacing="0" width="100%" class="tableButton" style="">
													<tbody>
														<tr>
															<td style="padding-top:20px;padding-bottom:20px" align="center" valign="top">
																<table border="0" cellpadding="0" cellspacing="0" align="center">
																	<tbody>
																		<tr>
																			<td style="background-color: #7B63FE; padding: 12px 35px; border-radius: 10px; width: 200px; height: 50px;" align="center" class="ctaButton">
																				<p style="color: #fff; font-size: x-large; font-weight: bold; letter-spacing: 20px;">${otp}</p>
																			</td>
																		</tr>
																		<tr>
																			<td style="padding-top: 10px; padding-left: 20px; padding-right: 20px;" align="center" valign="top" class="subTitle">
																				<h4 class="text" style="color:rgb(34, 34, 34);font-family:Poppins,Helvetica,Arial,sans-serif;font-size:12px;font-weight:200;font-style:normal;letter-spacing:normal;line-height:24px;text-transform:none;text-align:center;padding:0;margin:0">This key is only sent once!</h4>
																			</td>
																		</tr>
																	</tbody>
																</table>
															</td>
														</tr>
													</tbody>
												</table>
											</td>
										</tr>
										<tr>
											<td style="font-size:1px;line-height:1px" height="20">&nbsp;</td>
										</tr>
									</tbody>
								</table>
								<table border="0" cellpadding="0" cellspacing="0" width="100%" class="space">
									<tbody>
										<tr>
											<td style="font-size:1px;line-height:1px" height="30">&nbsp;</td>
										</tr>
									</tbody>
								</table>
							</td>
						</tr>
					</tbody>
				</table>

			</td>
		</tr>
	</tbody>
</table>
`;

export const recoveryEmailTemplate = (key: string) => juice(template(key));
