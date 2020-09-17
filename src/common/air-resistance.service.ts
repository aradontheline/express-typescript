import regression from 'regression';

export class AirResistanceService {

  airFunc: any
  air_properties = `T	Cp	µ.10**7	ν.10**6	k.10**3	α.10**6	Pr
  K	kJ/Kg.K	N.s/m2	m2/s	w/m.K	m2/s	
  100	1.032	71.1	2.00	9.34	2.54	0.786
  150	1.012	103.4	4.43	13.80	5.84	0.758
  200	1.007	132.5	7.59	18.10	10.30	0.737
  250	1.006	159.6	11.44	22.30	15.90	0.720
  300	1.007	184.6	15.89	26.30	22.50	0.707
  350	1.009	208.2	20.92	30.00	29.90	0.700
  400	1.014	230.1	26.41	33.80	38.30	0.690
  450	1.021	250.7	32.39	37.30	47.20	0.686
  500	1.030	270.1	38.79	40.70	56.70	0.684
  550	1.040	288.4	45.57	43.90	66.70	0.683
  600	1.051	305.8	52.69	46.90	76.90	0.685
  650	1.063	322.5	60.21	49.70	87.30	0.690
  700	1.075	338.8	68.10	52.40	98.00	0.695
  750	1.087	354.6	76.37	54.90	109.00	0.702
  800	1.099	369.8	84.93	57.30	120.00	0.709
  850	1.110	384.3	93.80	59.60	131.00	0.716
  900	1.121	398.1	102.90	62.00	143.00	0.720
  950	1.131	411.3	112.20	64.30	155.00	0.723
  1000	1.141	424.4	121.90	66.70	168.00	0.726`

  constructor() { }

  async findAirFunc({t_average:temp, outsideDiameter,params,borderTemps}) {
    if (this.airFunc) {
    } else {
      await this.findAirCurve()
    }
    return {
      specificHeatCurveFitting: this.airFunc.specificHeatCurveFitting.predict(temp)[1],
      viscosityCurveFitting: this.airFunc.viscosityCurveFitting.predict(temp)[1] / 10000000,
      kinematicViscosityCurveFitting: this.airFunc.kinematicViscosityCurveFitting.predict(temp)[1] / 1000000,
      thermalConductivityCurveFitting: this.airFunc.thermalConductivityCurveFitting.predict(temp)[1] / 1000,
      alphaCurveFitting: this.airFunc.alphaCurveFitting.predict(temp)[1] / 1000000,
      prandtlNumberCurveFitting: this.airFunc.prandtlNumberCurveFitting.predict(temp)[1],
      expansionCoefficient: 1 / temp,
      airDenisity: 29 / 0.0820575 / temp,
      Re: outsideDiameter / 1000 * params.windSpeed / (this.airFunc.kinematicViscosityCurveFitting.predict(temp)[1] / 1000000),
      Ra: 9.81 * 1 / temp * Math.abs(borderTemps[borderTemps.length-2] - borderTemps[borderTemps.length-1]) * (outsideDiameter / 1000) ** 3 / (this.airFunc.kinematicViscosityCurveFitting.predict(temp)[1] / 1000000 * this.airFunc.alphaCurveFitting.predict(temp)[1] / 1000000)
    }
  }

  async findAirCurve() {
    console.log('no air properties')
    let params = this.air_properties.split('\n')
      .map(r => {
        return r.trim()
      })
      .map(row => {
        return row.split('\t')
      })

    let dataSpecificHeatCurveFitting = await params.map((row, i) => {
      return [parseFloat(row[0]), parseFloat(row[1])]
    }).slice(2)
    let dataViscosityCurveFitting = params.map((row, i) => {
      return [parseFloat(row[0]), parseFloat(row[2])]
    }).slice(2)
    let dataKinematicViscosityCurveFitting = params.map((row, i) => {
      return [parseFloat(row[0]), parseFloat(row[3])]
    }).slice(2)
    let dataThermalConductivityCurveFitting = params.map((row, i) => {
      return [parseFloat(row[0]), parseFloat(row[4])]
    }).slice(2)
    let dataAlphaCurveFitting = params.map((row, i) => {
      return [parseFloat(row[0]), parseFloat(row[5])]
    }).slice(2)
    let dataPrandtlNumberCurveFitting = params.map((row, i) => {
      return [parseFloat(row[0]), parseFloat(row[6])]
    }).slice(2)

    let specificHeatCurveFitting = await regression.polynomial(dataSpecificHeatCurveFitting, { order: 4, precision: 10 });
    let viscosityCurveFitting = await regression.polynomial(dataViscosityCurveFitting, { order: 4, precision: 10 });
    let kinematicViscosityCurveFitting = await regression.polynomial(dataKinematicViscosityCurveFitting, { order: 4, precision: 10 });
    let thermalConductivityCurveFitting = await regression.polynomial(dataThermalConductivityCurveFitting, { order: 4, precision: 10 });
    let alphaCurveFitting = await regression.polynomial(dataAlphaCurveFitting, { order: 4, precision: 10 });
    let prandtlNumberCurveFitting = await regression.polynomial(dataPrandtlNumberCurveFitting, { order: 4, precision: 10 });
    this.airFunc = { specificHeatCurveFitting, viscosityCurveFitting, kinematicViscosityCurveFitting, thermalConductivityCurveFitting, alphaCurveFitting, prandtlNumberCurveFitting }
    return this.airFunc
  }

  async airFilmResistance({t_average, surfaceEmmisivity, outsideDiameter,borderTemps,params}) {

    // console.log({borderTemps})

    let airProperties = await this.findAirFunc({t_average, outsideDiameter,borderTemps,params})

    let G33 = airProperties.Re
    let G34 = airProperties.Ra
    let G27 = airProperties.prandtlNumberCurveFitting
    let G25 = airProperties.thermalConductivityCurveFitting


    let h_radiation = 0.00000005670373 * surfaceEmmisivity * ((borderTemps[borderTemps.length-2]) ** 4 - (borderTemps[borderTemps.length-1]) ** 4) / ((borderTemps[borderTemps.length-2] ) - (borderTemps[borderTemps.length-1] ))
    let Nu_forced = 0.3 + (0.62 * G33 ** 0.5 * G27 ** (1 / 3)) * (1 + (G33 / 282000) ** (5 / 8)) ** (4 / 5) / (1 + (0.4 / G27) ** (2 / 3)) ** (1 / 4)
    let h_forced = Nu_forced * G25 / (outsideDiameter / 1000)
    let Nu_free = (0.6 + 0.387 * G34 ** (1 / 6) / (1 + (0.559 / G27) * (9 / 16)) ** (8 / 27)) ** 2
    let h_free = Nu_free * G25 / (outsideDiameter / 1000)
    let Nu_combined = (Nu_forced ** 4 + Nu_free ** 4) ** (1 / 4)
    let h_convention = Nu_combined * G25 / (outsideDiameter / 1000)
    let h_air = h_convention + h_radiation
    return {
      h_radiation,
      Nu_forced,
      h_forced,
      Nu_free,
      h_free,
      Nu_combined,
      h_convention,
      h_air
    }
  }
}
