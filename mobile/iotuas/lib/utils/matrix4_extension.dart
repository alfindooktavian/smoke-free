import 'package:vector_math/vector_math_64.dart';

extension Matrix4Extension on Matrix4 {
  Matrix4 translateByDouble(double x, double y, [double z = 0, double w = 1]) {
    return this..translate(x, y, z);
  }

  Matrix4 scaleByDouble(double x, double y, [double z = 1, double w = 1]) {
    return this..scale(x, y, z);
  }
}
